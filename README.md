# 💰 SplitMate - Production Group Expense Sharing Application

SplitMate is a modern, production-ready, cross-platform mobile application for group expense sharing built with **React Native**, **TypeScript**, and **Google Firebase** (Free Spark Architecture), featuring **Native Android Bank SMS Auto-Detection**, **paise-exact split calculations**, **debt simplification**, and **FCM multi-device push notifications**.

---

## 🌟 Key Highlights

- **100% Free Firebase Architecture**: Built exclusively on Firebase Free Spark services (Firebase Authentication, Cloud Firestore, Firebase Cloud Messaging). No paid Cloud Functions, no backend servers, no Twilio, no paid SMS APIs.
- **Strict Security & Zero Credential Leakage**: Never bundles Firebase Admin SDK credentials, service account JSONs, or FCM server keys in the client application.
- **On-Device Bank SMS Auto-Detection (Android)**: Kotlin `BroadcastReceiver` listens to bank SMS locally, parses debit transactions with regex, generates SHA-256 duplicate fingerprints, and triggers interactive Android notifications.
- **Local Notification Action Buttons**:
  - `[ADD]`: Adds the detected expense directly to the user's default group with 1 tap in the background.
  - `[VIEW]`: Opens the SplitMate Expense Editor with pre-filled amount, merchant, and split options.
- **Absolute Privacy**: Raw SMS text is processed strictly on-device in memory and is **never** uploaded to Firebase or any external server.
- **Integer Paise Precision**: Eliminates floating-point rounding errors (e.g. ₹100 split 3 ways yields ₹33.34, ₹33.33, ₹33.33, totaling exactly ₹100.00).
- **Split Strategies**: Equal split with member inclusion toggles, Custom amount split, and Percentage split.
- **Automated Debt Simplification**: Computes who owes whom with the minimum possible number of settlement transactions.
- **Multi-Device FCM Token Registration**: Handles multiple devices per user (Android + iPhone) under `users/{uid}/devices/{deviceId}`.

---

## 📂 Project Structure

```
splitmate/
├── __tests__/                      # Jest Unit Tests
│   ├── balanceCalculator.test.ts   # Net balance & debt simplification tests
│   ├── smsParser.test.ts           # Bank SMS regex & filter tests
│   └── splitCalculator.test.ts     # Equal (paise math), Custom & Percentage tests
├── android/
│   ├── app/
│   │   ├── build.gradle            # App-level Gradle config
│   │   ├── google-services.json    # Firebase Android config
│   │   └── src/main/
│   │       ├── AndroidManifest.xml # Permissions (RECEIVE_SMS, POST_NOTIFICATIONS, etc.)
│   │       └── java/com/splitmate/
│   │           ├── MainActivity.kt          # ReactActivity & View action intent routing
│   │           ├── MainApplication.kt       # Application & package initialization
│   │           ├── NotificationHelper.kt    # NotificationChannel & local notifications
│   │           ├── QuickAddActionReceiver.kt# [ADD] Action button BroadcastReceiver
│   │           ├── SmsModule.kt             # React Native bridge & event emitter
│   │           ├── SmsPackage.kt            # ReactPackage registration
│   │           ├── SmsReceiver.kt           # Native Telephony SMS BroadcastReceiver
│   │           └── TransactionParser.kt     # Kotlin bank SMS pattern matching engine
│   ├── build.gradle                # Project-level Gradle config
│   └── settings.gradle
├── ios/
│   ├── Podfile                     # CocoaPods config with static Firebase linkage
│   ├── GoogleService-Info.plist    # Firebase iOS config
│   └── splitmate/
│       ├── AppDelegate.h
│       ├── AppDelegate.mm          # FIRApp configure & deep link delegate
│       └── Info.plist              # URL schemes (splitmate://) & APNs settings
├── src/
│   ├── components/                 # Reusable UI components
│   │   ├── AmountInput.tsx         # ₹ currency input box
│   │   ├── BalanceCard.tsx         # Green/Red net balance card
│   │   ├── Button.tsx              # Styled buttons (primary, outline, danger)
│   │   ├── EmptyState.tsx          # Empty state graphic & CTA
│   │   ├── ExpenseCard.tsx         # Expense item card with SMS badge
│   │   ├── GroupCard.tsx           # Group card with invite code pill
│   │   ├── MemberAvatar.tsx        # Circle avatar with initials
│   │   ├── NotificationCard.tsx    # In-app notification alert item
│   │   └── SplitSelector.tsx       # Equal / Custom / Percentage tabs
│   ├── hooks/                      # Custom React hooks
│   │   ├── useAuth.ts              # Authentication & user profile state
│   │   ├── useExpenses.ts          # Expenses, settlements, balances & debts
│   │   └── useGroups.ts            # Group creation, joining, & members
│   ├── navigation/                 # Navigation structure
│   │   ├── AppNavigator.tsx        # Bottom tabs & main screens stack
│   │   ├── AuthNavigator.tsx       # Login, Register, ForgotPassword stack
│   │   ├── RootNavigator.tsx       # Root container with splash & deep linking
│   │   └── types.ts                # TypeScript navigation route param types
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── ForgotPasswordScreen.tsx
│   │   │   ├── LoginScreen.tsx
│   │   │   └── RegisterScreen.tsx
│   │   ├── expenses/
│   │   │   ├── AddExpenseScreen.tsx
│   │   │   ├── EditExpenseScreen.tsx
│   │   │   └── ExpenseDetailsScreen.tsx
│   │   ├── groups/
│   │   │   ├── CreateGroupScreen.tsx
│   │   │   ├── GroupDetailsScreen.tsx
│   │   │   ├── GroupsScreen.tsx
│   │   │   ├── JoinGroupScreen.tsx
│   │   │   └── MembersScreen.tsx
│   │   ├── home/
│   │   │   └── HomeScreen.tsx
│   │   ├── notifications/
│   │   │   └── NotificationsScreen.tsx
│   │   ├── profile/
│   │   │   ├── ProfileScreen.tsx
│   │   │   └── SettingsScreen.tsx
│   │   └── settlements/
│   │       └── SettlementScreen.tsx
│   ├── services/                   # Service layer
│   │   ├── authService.ts          # Firebase Auth operations
│   │   ├── deviceService.ts        # Unique device ID & platform helpers
│   │   ├── expenseService.ts       # Firestore expenses & duplicate tracking
│   │   ├── firebase.ts             # Firebase initialization & offline persistence
│   │   ├── groupService.ts         # Groups & invite code generator
│   │   ├── notificationService.ts  # FCM device tokens & notifications
│   │   ├── settlementService.ts    # Settlements in Firestore
│   │   └── smsService.ts           # Native Android SMS bridge & permissions
│   ├── store/                      # Redux Toolkit
│   │   ├── index.ts                # Store configuration
│   │   └── slices/
│   │       ├── authSlice.ts
│   │       ├── expenseSlice.ts
│   │       ├── groupSlice.ts
│   │       ├── notificationSlice.ts
│   │       └── settingsSlice.ts
│   ├── types/                      # TypeScript domain models
│   │   ├── auth.ts
│   │   ├── expense.ts
│   │   ├── group.ts
│   │   ├── notification.ts
│   │   └── sms.ts
│   └── utils/                      # Pure helper functions
│       ├── currency.ts             # Currency formatting & paise conversions
│       ├── splitCalculator.ts      # Math algorithms for splits, balances & debts
│       └── transactionFingerprint.ts# SMS regex parser & hash fingerprinting
├── App.tsx                         # Root component
├── firebase.json                   # Firebase deployment config
├── firestore.rules                 # Strict security rules
├── firestore.indexes.json          # Firestore composite indexes
├── package.json
└── tsconfig.json
```

---

## 🗄️ Firestore Database Schema

```
users/
  {uid}/
    displayName: string
    email: string
    photoURL: string | null
    defaultGroupId: string | null
    createdAt: number
    updatedAt: number
    devices/
      {deviceId}/
        deviceId: string
        fcmToken: string
        platform: "android" | "ios"
        updatedAt: number

groups/
  {groupId}/
    groupId: string
    name: string
    inviteCode: string (e.g. "GOA7K2")
    createdBy: string (uid)
    createdAt: number
    updatedAt: number
    memberCount: number
    members/
      {uid}/
        uid: string
        displayName: string
        email: string
        role: "owner" | "admin" | "member"
        joinedAt: number
    expenses/
      {expenseId}/
        expenseId: string
        groupId: string
        amount: number
        currency: "INR"
        paidBy: string (uid)
        description: string
        merchant?: string
        splitType: "equal" | "custom" | "percentage"
        source: "manual" | "bank_sms"
        createdAt: number
        splits/
          {uid}/
            userId: string
            amountOwed: number
            percentage?: number
    settlements/
      {settlementId}/
        settlementId: string
        groupId: string
        fromUserId: string
        toUserId: string
        amount: number
        createdAt: number
        notes?: string

processedTransactions/
  {fingerprint}/
    fingerprint: string
    userId: string
    amount: number
    detectedAt: number
    createdExpenseId?: string
    groupId?: string

notifications/
  {notificationId}/
    notificationId: string
    type: "expense_added" | "settlement_recorded"
    title: string
    body: string
    groupId: string
    groupName: string
    expenseId?: string
    actorId: string
    actorName: string
    amount: number
    createdAt: number
    readBy: { [uid]: boolean }
```

---

## 🛡️ Security Rules (`firestore.rules`)

The security rules enforce:
1. **Authenticated Access Only**: `request.auth != null` required everywhere.
2. **Strict Group Membership**: Users can only read, create, or modify expenses/settlements for groups they are members of (`isGroupMember(groupId)`).
3. **Payer Verification**: Users cannot forge or set the payer to another member without authorization.
4. **Owner Restrictions**: Only group creators/owners can delete a group or rename settings.
5. **Private Profile Protection**: Users cannot overwrite another member's profile or device tokens.
6. **Immutable Duplicate Tracking**: Documents in `processedTransactions` cannot be tampered with or deleted by clients.

---

## 📱 Android Bank SMS Detection (Local & Private)

### Supported Patterns
- `"Rs.500 debited from A/C XX1234 at XYZ Store on 03-10-26."`
- `"INR 500 spent at Starbucks"`
- `"₹500 debited"`
- `"debited by Rs 500"`
- `"transaction of INR 500"`

### Filtered (Ignored) Messages
- OTPs (`"Your OTP is 123456"`, `"verification code"`)
- Account balance inquiries (`"Your account balance is Rs.5000"`)
- Failed transactions (`"Transaction failed for Rs.500"`)
- Reversals & cancellations (`"Transaction reversed"`)
- Marketing / promo alerts (`"Pre-approved loan"`, `"Special offer"`)
- Credit alerts (`"Rs.500 credited"`)

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18
- Java Development Kit (JDK 17)
- Android SDK & Android Studio (for Android build)
- Xcode & CocoaPods (for iOS build on macOS)

### 1. Installation
```bash
npm install
```

### 2. Run Tests
```bash
npm test
```
All unit tests for SMS parsing, paise precision, and balance calculations will execute.

### 3. Firebase Setup
1. Create a free project in the [Firebase Console](https://console.firebase.google.com/).
2. Enable **Authentication** -> **Email/Password**.
3. Enable **Cloud Firestore** in production mode.
4. Deploy security rules and indexes:
   ```bash
   npx firebase deploy --only firestore
   ```
5. Register Android app:
   - Package name: `com.splitmate`
   - Download `google-services.json` and place it in `android/app/google-services.json`.
6. Register iOS app:
   - Bundle identifier: `com.splitmate`
   - Download `GoogleService-Info.plist` and place it in `ios/GoogleService-Info.plist`.

### 4. Running on Android
```bash
npm run android
```

### 5. Running on iOS
```bash
cd ios && pod install && cd ..
npm run ios
```

---

## 📦 Building Production Android APK

To build a standalone APK:
```bash
cd android
./gradlew assembleRelease
```
The generated APK will be available at:
`android/app/build/outputs/apk/release/app-release.apk`
