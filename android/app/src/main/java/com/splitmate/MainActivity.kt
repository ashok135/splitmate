package com.splitmate

import android.content.Intent
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

    override fun getMainComponentName(): String = "splitmate"

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(null) // For react-native-screens compatibility
        handleNotificationIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleNotificationIntent(intent)
    }

    private fun handleNotificationIntent(intent: Intent?) {
        if (intent == null) return
        val action = intent.getStringExtra("action")
        if (action == "VIEW_TRANSACTION") {
            val amount = intent.getDoubleExtra("amount", 0.0)
            val merchant = intent.getStringExtra("merchant") ?: ""
            val fingerprint = intent.getStringExtra("fingerprint") ?: ""
            val groupId = intent.getStringExtra("groupId") ?: ""

            val tx = ParsedTransaction(
                isTransaction = true,
                type = "DEBIT",
                amount = amount,
                merchant = merchant,
                referenceId = null,
                timestamp = System.currentTimeMillis(),
                fingerprint = fingerprint,
                bank = null,
                accountSuffix = null
            )
            SmsModule.sendTransactionEvent(tx)
        }
    }
}
