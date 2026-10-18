CREATE TYPE "UserStatus" AS ENUM ('ACTIVE','SUSPENDED','CLOSED');
CREATE TYPE "WalletKind" AS ENUM ('BONUS','CASH');
CREATE TYPE "OtpPurpose" AS ENUM ('SIGN_IN','SIGN_UP');
CREATE TYPE "LedgerAccountKind" AS ENUM ('USER_BONUS','USER_CASH','PLATFORM_BONUS_CLEARING','PLATFORM_CASH_CLEARING');
CREATE TYPE "LedgerTransactionType" AS ENUM ('SIGNUP_BONUS','DEPOSIT','WITHDRAWAL','BET_STAKE','BET_PAYOUT','REFUND','ADJUSTMENT');
CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "phone_e164" VARCHAR(16) NOT NULL,
  "phone_verified_at" TIMESTAMPTZ(6),
  "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "otp_challenges" (
  "id" TEXT NOT NULL,
  "phone_e164" VARCHAR(16) NOT NULL,
  "purpose" "OtpPurpose" NOT NULL,
  "code_digest" VARCHAR(128) NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "max_attempts" INTEGER NOT NULL DEFAULT 5,
  "consumed_at" TIMESTAMPTZ(6),
  "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "user_id" TEXT,
  CONSTRAINT "otp_challenges_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "refresh_tokens" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "token_hash" VARCHAR(128) NOT NULL,
  "family_id" VARCHAR(64) NOT NULL,
  "parent_token_id" TEXT,
  "replaced_by_id" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "used_at" TIMESTAMPTZ(6),
  "revoked_at" TIMESTAMPTZ(6),
  CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ledger_accounts" (
  "id" TEXT NOT NULL,
  "kind" "LedgerAccountKind" NOT NULL,
  "user_id" TEXT,
  "currency" CHAR(3) NOT NULL DEFAULT 'NGN',
  CONSTRAINT "ledger_accounts_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "wallet_accounts" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "kind" "WalletKind" NOT NULL,
  "currency" CHAR(3) NOT NULL DEFAULT 'NGN',
  "balance_kobo" BIGINT NOT NULL DEFAULT 0,
  "ledger_account_id" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "wallet_accounts_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ledger_transactions" (
  "id" TEXT NOT NULL,
  "type" "LedgerTransactionType" NOT NULL,
  "idempotency_key" VARCHAR(128) NOT NULL,
  "reference" VARCHAR(128),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ledger_transactions_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ledger_entries" (
  "id" TEXT NOT NULL,
  "transaction_id" TEXT NOT NULL,
  "account_id" TEXT NOT NULL,
  "amount_kobo" BIGINT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "bonus_grants" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "kind" VARCHAR(32) NOT NULL DEFAULT 'SIGNUP',
  "amount_kobo" BIGINT NOT NULL,
  "idempotency_key" VARCHAR(128) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "bonus_grants_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_phone_e164_key" ON "users"("phone_e164");
CREATE INDEX "otp_challenges_phone_e164_purpose_requested_at_idx" ON "otp_challenges"("phone_e164","purpose","requested_at");
CREATE INDEX "otp_challenges_expires_at_idx" ON "otp_challenges"("expires_at");
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");
CREATE INDEX "refresh_tokens_family_id_idx" ON "refresh_tokens"("family_id");
CREATE INDEX "refresh_tokens_user_id_revoked_at_idx" ON "refresh_tokens"("user_id","revoked_at");
CREATE INDEX "ledger_accounts_user_id_kind_idx" ON "ledger_accounts"("user_id","kind");
CREATE UNIQUE INDEX "wallet_accounts_ledger_account_id_key" ON "wallet_accounts"("ledger_account_id");
CREATE UNIQUE INDEX "wallet_accounts_user_id_kind_currency_key" ON "wallet_accounts"("user_id","kind","currency");
CREATE UNIQUE INDEX "ledger_transactions_idempotency_key_key" ON "ledger_transactions"("idempotency_key");
CREATE INDEX "ledger_entries_account_id_created_at_idx" ON "ledger_entries"("account_id","created_at");
CREATE INDEX "ledger_entries_transaction_id_idx" ON "ledger_entries"("transaction_id");
CREATE UNIQUE INDEX "bonus_grants_idempotency_key_key" ON "bonus_grants"("idempotency_key");
CREATE UNIQUE INDEX "bonus_grants_user_id_kind_key" ON "bonus_grants"("user_id","kind");
ALTER TABLE "otp_challenges" ADD CONSTRAINT "otp_challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wallet_accounts" ADD CONSTRAINT "wallet_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "wallet_accounts" ADD CONSTRAINT "wallet_accounts_ledger_account_id_fkey" FOREIGN KEY ("ledger_account_id") REFERENCES "ledger_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "ledger_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "ledger_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bonus_grants" ADD CONSTRAINT "bonus_grants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
