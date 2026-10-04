package com.splitmate

import android.content.Context
import android.util.Base64
import android.util.Log
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.security.KeyFactory
import java.security.PrivateKey
import java.security.Signature
import java.security.spec.PKCS8EncodedKeySpec
import java.util.concurrent.Executors

object FcmHelper {
    private const val TAG = "SplitMate_FcmHelper"
    private val executor = Executors.newSingleThreadExecutor()

    private var cachedToken: String? = null
    private var tokenExpiryTime: Long = 0

    private fun getPrivateKey(keyPem: String): PrivateKey {
        val cleanKey = keyPem
            .replace("-----BEGIN PRIVATE KEY-----", "")
            .replace("-----END PRIVATE KEY-----", "")
            .replace("\\s+".toRegex(), "")
        val keyBytes = Base64.decode(cleanKey, Base64.DEFAULT)
        val spec = PKCS8EncodedKeySpec(keyBytes)
        val kf = KeyFactory.getInstance("RSA")
        return kf.generatePrivate(spec)
    }

    private fun base64UrlEncode(bytes: ByteArray): String {
        return Base64.encodeToString(bytes, Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP)
    }

    private fun getOAuth2AccessToken(context: Context): String? {
        val now = System.currentTimeMillis() / 1000
        if (cachedToken != null && now < (tokenExpiryTime - 60)) {
            return cachedToken
        }

        try {
            val jsonStr = context.assets.open("service-account.json").bufferedReader().use { it.readText() }
            val sa = JSONObject(jsonStr)
            val clientEmail = sa.getString("client_email")
            val privateKeyPem = sa.getString("private_key")

            val header = JSONObject().apply {
                put("alg", "RS256")
                put("typ", "JWT")
            }.toString().toByteArray(Charsets.UTF_8)

            val payload = JSONObject().apply {
                put("iss", clientEmail)
                put("sub", clientEmail)
                put("aud", "https://oauth2.googleapis.com/token")
                put("iat", now)
                put("exp", now + 3600)
                put("scope", "https://www.googleapis.com/auth/firebase.messaging")
            }.toString().toByteArray(Charsets.UTF_8)

            val headerEncoded = base64UrlEncode(header)
            val payloadEncoded = base64UrlEncode(payload)
            val dataToSign = "$headerEncoded.$payloadEncoded"

            val privateKey = getPrivateKey(privateKeyPem)
            val signature = Signature.getInstance("SHA256withRSA").apply {
                initSign(privateKey)
                update(dataToSign.toByteArray(Charsets.UTF_8))
            }
            val signatureEncoded = base64UrlEncode(signature.sign())
            val jwt = "$dataToSign.$signatureEncoded"

            val url = URL("https://oauth2.googleapis.com/token")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded")
            conn.doOutput = true

            val postData = "grant_type=" + URLEncoder.encode("urn:ietf:params:oauth:grant-type:jwt-bearer", "UTF-8") +
                    "&assertion=" + URLEncoder.encode(jwt, "UTF-8")

            OutputStreamWriter(conn.outputStream).use { it.write(postData) }

            val responseCode = conn.responseCode
            if (responseCode == 200) {
                val responseStr = BufferedReader(InputStreamReader(conn.inputStream)).use { it.readText() }
                val respJson = JSONObject(responseStr)
                val token = respJson.getString("access_token")
                val expiresIn = respJson.optLong("expires_in", 3600)
                cachedToken = token
                tokenExpiryTime = now + expiresIn
                return token
            } else {
                val errorStr = BufferedReader(InputStreamReader(conn.errorStream ?: conn.inputStream)).use { it.readText() }
                Log.e(TAG, "OAuth2 token failed: $responseCode - $errorStr")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting OAuth2 token", e)
        }
        return null
    }

    /**
     * Send push notification to a group's topic using FCM v1 HTTP API.
     * All devices subscribed to `group_{groupId}` will receive the notification
     * with high-priority heads-up banner popping up at the top of the screen.
     */
    fun sendGroupPush(
        context: Context,
        title: String,
        body: String,
        groupId: String,
        groupName: String,
        expenseId: String?,
        actorId: String,
        actorName: String
    ) {
        executor.execute {
            try {
                val token = getOAuth2AccessToken(context) ?: return@execute
                val jsonStr = context.assets.open("service-account.json").bufferedReader().use { it.readText() }
                val sa = JSONObject(jsonStr)
                val projectId = sa.getString("project_id")

                val messageObj = JSONObject().apply {
                    put("topic", "group_$groupId")
                    put("notification", JSONObject().apply {
                        put("title", title)
                        put("body", body)
                    })
                    put("android", JSONObject().apply {
                        put("priority", "HIGH")
                        put("notification", JSONObject().apply {
                            put("channel_id", NotificationHelper.CHANNEL_ID)
                            put("notification_priority", "PRIORITY_MAX")
                            put("default_sound", true)
                            put("default_vibrate_timings", true)
                            put("visibility", "PUBLIC")
                        })
                    })
                    put("data", JSONObject().apply {
                        put("title", title)
                        put("body", body)
                        put("groupId", groupId)
                        put("groupName", groupName)
                        put("expenseId", expenseId ?: "")
                        put("actorId", actorId)
                        put("actorName", actorName)
                    })
                }

                val rootObj = JSONObject().apply {
                    put("message", messageObj)
                }

                val url = URL("https://fcm.googleapis.com/v1/projects/$projectId/messages:send")
                val conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("Authorization", "Bearer $token")
                conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8")
                conn.doOutput = true

                OutputStreamWriter(conn.outputStream, Charsets.UTF_8).use { it.write(rootObj.toString()) }

                val code = conn.responseCode
                if (code == 200) {
                    Log.i(TAG, "Group push sent successfully to topic group_$groupId: $title")
                } else {
                    val err = BufferedReader(InputStreamReader(conn.errorStream ?: conn.inputStream)).use { it.readText() }
                    Log.e(TAG, "FCM send failed: $code - $err")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to send FCM push", e)
            }
        }
    }
}
