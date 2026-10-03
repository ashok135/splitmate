package com.splitmate

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.widget.Toast
import androidx.core.app.NotificationManagerCompat

class QuickAddActionReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != "com.splitmate.ACTION_QUICK_ADD") return

        val amount = intent.getDoubleExtra("amount", 0.0)
        val merchant = intent.getStringExtra("merchant") ?: "Bank Transaction"
        val fingerprint = intent.getStringExtra("fingerprint") ?: ""
        val groupId = intent.getStringExtra("groupId") ?: ""
        val groupName = intent.getStringExtra("groupName") ?: "your default group"

        if (amount <= 0.0 || groupId.isEmpty()) {
            Toast.makeText(context, "Please open SplitMate to select a group", Toast.LENGTH_SHORT).show()
            return
        }

        // Store pending quick expense in local SharedPreferences for RN sync
        val prefs = context.getSharedPreferences("splitmate_prefs", Context.MODE_PRIVATE)
        val pendingList = prefs.getStringSet("pending_quick_adds", mutableSetOf()) ?: mutableSetOf()
        val newPending = HashSet(pendingList)
        newPending.add("$groupId|$amount|$merchant|$fingerprint|${System.currentTimeMillis()}")
        prefs.edit().putStringSet("pending_quick_adds", newPending).apply()

        // Dismiss notification
        val notificationManager = NotificationManagerCompat.from(context)
        notificationManager.cancelAll()

        Toast.makeText(context, "Added ₹$amount to $groupName", Toast.LENGTH_SHORT).show()
    }
}
