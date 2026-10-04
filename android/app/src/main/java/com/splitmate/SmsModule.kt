package com.splitmate

import android.content.Context
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class SmsModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private var instance: SmsModule? = null

        fun sendTransactionEvent(tx: ParsedTransaction) {
            val module = instance ?: return
            val context = module.reactContext
            if (!context.hasActiveReactInstance()) return

            val map = Arguments.createMap().apply {
                putBoolean("isTransaction", tx.isTransaction)
                putString("type", tx.type)
                putDouble("amount", tx.amount ?: 0.0)
                putString("merchant", tx.merchant ?: "")
                putString("referenceId", tx.referenceId ?: "")
                putDouble("timestamp", tx.timestamp.toDouble())
                putString("fingerprint", tx.fingerprint)
                putString("bank", tx.bank ?: "")
                putString("accountSuffix", tx.accountSuffix ?: "")
            }

            context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("onBankTransactionDetected", map)
        }

        fun sendPendingQuickAddEvent() {
            val module = instance ?: return
            val context = module.reactContext
            if (!context.hasActiveReactInstance()) return

            context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("onPendingQuickAddUpdated", Arguments.createMap())
        }
    }

    init {
        instance = this
    }

    override fun getName(): String = "SmsModule"

    @ReactMethod
    fun setDetectionEnabled(enabled: Boolean) {
        val prefs = reactContext.getSharedPreferences("splitmate_prefs", Context.MODE_PRIVATE)
        prefs.edit().putBoolean("sms_detection_enabled", enabled).apply()
    }

    @ReactMethod
    fun setDefaultGroup(groupId: String, groupName: String) {
        val prefs = reactContext.getSharedPreferences("splitmate_prefs", Context.MODE_PRIVATE)
        prefs.edit()
            .putString("default_group_id", groupId)
            .putString("default_group_name", groupName)
            .apply()
    }

    @ReactMethod
    fun simulateIncomingSms(message: String, promise: Promise) {
        val parsed = TransactionParser.parse(message)
        val map = Arguments.createMap().apply {
            putBoolean("isTransaction", parsed.isTransaction)
            putString("type", parsed.type)
            putDouble("amount", parsed.amount ?: 0.0)
            putString("merchant", parsed.merchant ?: "")
            putString("fingerprint", parsed.fingerprint)
        }
        promise.resolve(map)
    }

    @ReactMethod
    fun getPendingQuickAdds(promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences("splitmate_prefs", Context.MODE_PRIVATE)
            val set = prefs.getStringSet("pending_quick_adds", setOf()) ?: setOf()
            val array = Arguments.createArray()
            for (item in set) {
                array.pushString(item)
            }
            promise.resolve(array)
        } catch (e: Exception) {
            promise.reject("ERR_PENDING_QUICK_ADDS", e.message)
        }
    }

    @ReactMethod
    fun clearPendingQuickAdds(promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences("splitmate_prefs", Context.MODE_PRIVATE)
            prefs.edit().remove("pending_quick_adds").apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_CLEAR_QUICK_ADDS", e.message)
        }
    }

    @ReactMethod
    fun showSystemNotification(
        title: String,
        body: String,
        subText: String?,
        groupId: String?,
        expenseId: String?
    ) {
        NotificationHelper.showAppNotification(
            reactContext,
            title,
            body,
            subText,
            groupId,
            expenseId
        )
    }

    @ReactMethod
    fun dispatchGroupPush(
        title: String,
        body: String,
        groupId: String,
        groupName: String,
        expenseId: String?,
        actorId: String,
        actorName: String,
        promise: Promise
    ) {
        try {
            FcmHelper.sendGroupPush(
                reactContext,
                title,
                body,
                groupId,
                groupName,
                expenseId,
                actorId,
                actorName
            )
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_FCM_DISPATCH", e.message)
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for RN built-in Event Emitter Calls
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for RN built-in Event Emitter Calls
    }
}
