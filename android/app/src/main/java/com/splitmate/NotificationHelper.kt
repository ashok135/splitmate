package com.splitmate

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

object NotificationHelper {

    const val CHANNEL_ID = "splitmate_transactions"
    const val CHANNEL_NAME = "Bank Transaction Alerts"
    private const val NOTIFICATION_ID_BASE = 1000

    fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel(CHANNEL_ID, CHANNEL_NAME, importance).apply {
                description = "Notifies when a debit transaction SMS is detected"
                enableVibration(true)
            }
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    fun showTransactionNotification(
        context: Context,
        tx: ParsedTransaction,
        defaultGroupId: String?,
        defaultGroupName: String?
    ) {
        createNotificationChannel(context)

        val groupLabel = defaultGroupName ?: "Default Group"
        val title = "💰 Transaction detected"
        val body = "₹${tx.amount} transaction detected${if (tx.merchant != null) " at ${tx.merchant}" else ""}"
        val subText = "Add to $groupLabel?"

        // VIEW Action -> Opens Add/Edit Expense screen in SplitMate app
        val viewIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("action", "VIEW_TRANSACTION")
            putExtra("amount", tx.amount ?: 0.0)
            putExtra("merchant", tx.merchant ?: "")
            putExtra("fingerprint", tx.fingerprint)
            putExtra("groupId", defaultGroupId ?: "")
        }
        val viewPendingIntent = PendingIntent.getActivity(
            context,
            (System.currentTimeMillis() % 10000).toInt(),
            viewIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // ADD Action -> Directly adds to default group in background
        val addIntent = Intent(context, QuickAddActionReceiver::class.java).apply {
            action = "com.splitmate.ACTION_QUICK_ADD"
            putExtra("amount", tx.amount ?: 0.0)
            putExtra("merchant", tx.merchant ?: "")
            putExtra("fingerprint", tx.fingerprint)
            putExtra("groupId", defaultGroupId ?: "")
            putExtra("groupName", defaultGroupName ?: "")
        }
        val addPendingIntent = PendingIntent.getBroadcast(
            context,
            (System.currentTimeMillis() % 10000 + 1).toInt(),
            addIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notifId = (NOTIFICATION_ID_BASE + (System.currentTimeMillis() % 500)).toInt()

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setSubText(subText)
            .setStyle(NotificationCompat.BigTextStyle().bigText("$body\n$subText"))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(viewPendingIntent)
            .addAction(android.R.drawable.ic_input_add, "ADD", addPendingIntent)
            .addAction(android.R.drawable.ic_menu_view, "VIEW", viewPendingIntent)

        val notificationManager = NotificationManagerCompat.from(context)
        try {
            notificationManager.notify(notifId, builder.build())
        } catch (e: SecurityException) {
            // Handled if POST_NOTIFICATIONS permission wasn't granted yet
        }
    }
}
