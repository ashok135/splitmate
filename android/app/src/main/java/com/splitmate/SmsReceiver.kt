package com.splitmate

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import android.provider.Telephony
import android.telephony.SmsMessage

class SmsReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) {
            return
        }

        val prefs = context.getSharedPreferences("splitmate_prefs", Context.MODE_PRIVATE)
        val isDetectionEnabled = prefs.getBoolean("sms_detection_enabled", true)
        if (!isDetectionEnabled) return

        val messages: Array<SmsMessage>? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            Telephony.Sms.Intents.getMessagesFromIntent(intent)
        } else {
            @Suppress("DEPRECATION")
            val pdus = intent.extras?.get("pdus") as? Array<*>
            pdus?.mapNotNull {
                @Suppress("DEPRECATION")
                SmsMessage.createFromPdu(it as ByteArray)
            }?.toTypedArray()
        }

        if (messages.isNullOrEmpty()) return

        val fullBodyBuilder = StringBuilder()
        var timestamp = System.currentTimeMillis()

        for (sms in messages) {
            fullBodyBuilder.append(sms.messageBody)
            timestamp = sms.timestampMillis
        }

        val body = fullBodyBuilder.toString()

        // Local parsing only - raw SMS is never uploaded
        val parsed = TransactionParser.parse(body, timestamp)

        if (parsed.isTransaction && parsed.type == "DEBIT" && (parsed.amount ?: 0.0) > 0.0) {
            // Check for duplicate fingerprint in local store
            val processedSet = prefs.getStringSet("processed_fingerprints", mutableSetOf()) ?: mutableSetOf()
            if (processedSet.contains(parsed.fingerprint)) {
                return // Duplicate transaction, do not notify again
            }

            // Record fingerprint
            val newSet = HashSet(processedSet)
            newSet.add(parsed.fingerprint)
            prefs.edit().putStringSet("processed_fingerprints", newSet).apply()

            val defaultGroupId = prefs.getString("default_group_id", null)
            val defaultGroupName = prefs.getString("default_group_name", null)

            // 1. Show local Android notification with [ADD] and [VIEW]
            NotificationHelper.showTransactionNotification(
                context,
                parsed,
                defaultGroupId,
                defaultGroupName
            )

            // 2. Notify React Native if app is alive
            SmsModule.sendTransactionEvent(parsed)
        }
    }
}
