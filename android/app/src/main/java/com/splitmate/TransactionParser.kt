package com.splitmate

import java.util.regex.Pattern

data class ParsedTransaction(
    val isTransaction: Boolean,
    val type: String, // "DEBIT", "CREDIT", "UNKNOWN"
    val amount: Double?,
    val merchant: String?,
    val referenceId: String?,
    val timestamp: Long,
    val fingerprint: String,
    val bank: String?,
    val accountSuffix: String?
)

object TransactionParser {

    private val IGNORED_KEYWORDS = listOf(
        "otp",
        "one time password",
        "verification code",
        "security code",
        "balance is",
        "available balance",
        "avail bal",
        "failed",
        "failure",
        "reversed",
        "reversal",
        "cancelled",
        "canceled",
        "login alert",
        "promo",
        "offer",
        "pre-approved"
    )

    private val DEBIT_KEYWORDS = listOf(
        "debited", "spent", "paid", "withdrawn", "deducted", "purchase of", "debit of", "sent to"
    )

    private val CREDIT_KEYWORDS = listOf(
        "credited", "received", "deposit", "deposited"
    )

    fun parse(message: String, timestamp: Long = System.currentTimeMillis()): ParsedTransaction {
        val emptyResult = ParsedTransaction(
            isTransaction = false,
            type = "UNKNOWN",
            amount = null,
            merchant = null,
            referenceId = null,
            timestamp = timestamp,
            fingerprint = "",
            bank = null,
            accountSuffix = null
        )

        if (message.isBlank()) return emptyResult

        val lowerMsg = message.lowercase()

        // 1. Filter out OTP, promotional, balance, and failed messages
        for (pattern in IGNORED_KEYWORDS) {
            if (lowerMsg.contains(pattern)) {
                return emptyResult
            }
        }

        // 2. Identify Transaction Type
        val hasDebit = DEBIT_KEYWORDS.any { lowerMsg.contains(it) }
        val hasCredit = CREDIT_KEYWORDS.any { lowerMsg.contains(it) }

        val type = when {
            hasDebit && !hasCredit -> "DEBIT"
            hasCredit && !hasDebit -> "CREDIT"
            hasDebit && hasCredit -> "DEBIT"
            else -> return emptyResult
        }

        // Only support DEBIT for MVP auto-expense detection
        if (type != "DEBIT") {
            return emptyResult.copy(isTransaction = true, type = "CREDIT")
        }

        // 3. Extract Amount
        val amountPatterns = listOf(
            Pattern.compile("""(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)""", Pattern.CASE_INSENSITIVE),
            Pattern.compile("""([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:rs\.?|inr|₹)""", Pattern.CASE_INSENSITIVE),
            Pattern.compile("""(?:debited by|spent|paid)\s*(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)""", Pattern.CASE_INSENSITIVE),
            Pattern.compile("""transaction of\s*(?:inr|rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)""", Pattern.CASE_INSENSITIVE)
        )

        var amount: Double? = null
        for (p in amountPatterns) {
            val matcher = p.matcher(message)
            if (matcher.find()) {
                val clean = matcher.group(1)?.replace(",", "")
                val parsed = clean?.toDoubleOrNull()
                if (parsed != null && parsed > 0.0) {
                    amount = parsed
                    break
                }
            }
        }

        if (amount == null || amount <= 0.0) {
            return emptyResult
        }

        // 4. Extract Merchant
        var merchant: String? = null
        val merchantPatterns = listOf(
            Pattern.compile("""(?:at|to|info/|vpa)\s+([A-Za-z0-9\s&'.-]{2,30}?)(?:\s+on|\s+at|\s+ref|\s+dated|\s+bal|\.|\band\b|$)""", Pattern.CASE_INSENSITIVE),
            Pattern.compile("""(?:towards|for)\s+([A-Za-z0-9\s&'.-]{2,25}?)(?:\s+on|\s+ref|\.|$)""", Pattern.CASE_INSENSITIVE)
        )

        for (p in merchantPatterns) {
            val matcher = p.matcher(message)
            if (matcher.find()) {
                val m = matcher.group(1)?.trim()
                if (m != null && !m.matches(Regex("""^(a/c|account|your account|card|bank|upi|atm|cash)$""", RegexOption.IGNORE_CASE))) {
                    merchant = m
                    break
                }
            }
        }

        // 5. Extract Reference ID
        var referenceId: String? = null
        val refPattern = Pattern.compile("""(?:ref(?:erence)?(?:\s*no|\s*id)?|txn(?:\s*id)?|utr(?:\s*no)?)\s*[:#\-]?\s*([A-Za-z0-9]{6,22})""", Pattern.CASE_INSENSITIVE)
        val refMatcher = refPattern.matcher(message)
        if (refMatcher.find()) {
            referenceId = refMatcher.group(1)?.trim()
        }

        // 6. Extract Account Suffix
        var accountSuffix: String? = null
        val accPattern = Pattern.compile("""(?:a/c|acct|card|ending)\s*(?:no\.?)?\s*[*xX]*([0-9]{4})""", Pattern.CASE_INSENSITIVE)
        val accMatcher = accPattern.matcher(message)
        if (accMatcher.find()) {
            accountSuffix = accMatcher.group(1)
        }

        // 7. Extract Bank
        val bank = when {
            lowerMsg.contains("hdfc") -> "HDFC Bank"
            lowerMsg.contains("sbi") || lowerMsg.contains("state bank") -> "SBI"
            lowerMsg.contains("icici") -> "ICICI Bank"
            lowerMsg.contains("axis") -> "Axis Bank"
            lowerMsg.contains("kotak") -> "Kotak Bank"
            lowerMsg.contains("pnb") -> "Punjab National Bank"
            lowerMsg.contains("paytm") -> "Paytm Bank"
            else -> null
        }

        // 8. Generate Fingerprint
        val raw = "${amount}|${(referenceId ?: "").lowercase().trim()}|${timestamp / (1000 * 60 * 5)}|${(merchant ?: "").lowercase().trim()}"
        val fingerprint = "tx_${Integer.toHexString(raw.hashCode())}"

        return ParsedTransaction(
            isTransaction = true,
            type = "DEBIT",
            amount = amount,
            merchant = merchant,
            referenceId = referenceId,
            timestamp = timestamp,
            fingerprint = fingerprint,
            bank = bank,
            accountSuffix = accountSuffix
        )
    }
}
