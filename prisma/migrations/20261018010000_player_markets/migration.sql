ALTER TYPE "LedgerAccountKind" ADD VALUE IF NOT EXISTS 'PLATFORM_FEE_REVENUE';
CREATE TYPE "MarketStatus" AS ENUM ('DRAFT','OPEN','SUSPENDED','CLOSED','SETTLED');
CREATE TYPE "MarketOutcome" AS ENUM ('OVER','UNDER');
CREATE TYPE "TradeSide" AS ENUM ('BUY','SELL');
CREATE TABLE "player_markets" (
  "id" TEXT NOT NULL,
  "player_name" VARCHAR(120) NOT NULL,
  "team_name" VARCHAR(120) NOT NULL,
  "opponent_name" VARCHAR(120) NOT NULL,
  "competition" VARCHAR(120) NOT NULL,
  "stat_key" VARCHAR(80) NOT NULL,
  "stat_label" VARCHAR(120) NOT NULL,
  "line_value" DECIMAL(8,2) NOT NULL,
  "kickoff_at" TIMESTAMPTZ(6) NOT NULL,
  "status" "MarketStatus" NOT NULL DEFAULT 'DRAFT',
  "liquidity_naira" DECIMAL(14,2) NOT NULL DEFAULT 50000,
  "fee_bps" INTEGER NOT NULL DEFAULT 200,
  "over_shares" DECIMAL(20,2) NOT NULL DEFAULT 0,
  "under_shares" DECIMAL(20,2) NOT NULL DEFAULT 0,
  "resolved_outcome" "MarketOutcome",
  "settled_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "player_markets_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "market_positions" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "market_id" TEXT NOT NULL,
  "outcome" "MarketOutcome" NOT NULL,
  "shares" DECIMAL(20,2) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "market_positions_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "market_trades" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "market_id" TEXT NOT NULL,
  "outcome" "MarketOutcome" NOT NULL,
  "side" "TradeSide" NOT NULL,
  "shares" DECIMAL(20,2) NOT NULL,
  "gross_amount_kobo" BIGINT NOT NULL,
  "fee_kobo" BIGINT NOT NULL,
  "net_amount_kobo" BIGINT NOT NULL,
  "idempotency_key" VARCHAR(128) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "market_trades_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "player_markets_status_kickoff_at_idx" ON "player_markets"("status","kickoff_at");
CREATE INDEX "player_markets_player_name_kickoff_at_idx" ON "player_markets"("player_name","kickoff_at");
CREATE UNIQUE INDEX "market_positions_user_id_market_id_outcome_key" ON "market_positions"("user_id","market_id","outcome");
CREATE INDEX "market_positions_user_id_updated_at_idx" ON "market_positions"("user_id","updated_at");
CREATE UNIQUE INDEX "market_trades_idempotency_key_key" ON "market_trades"("idempotency_key");
CREATE INDEX "market_trades_user_id_created_at_idx" ON "market_trades"("user_id","created_at");
CREATE INDEX "market_trades_market_id_created_at_idx" ON "market_trades"("market_id","created_at");
ALTER TABLE "market_positions" ADD CONSTRAINT "market_positions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "market_positions" ADD CONSTRAINT "market_positions_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "player_markets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "market_trades" ADD CONSTRAINT "market_trades_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "market_trades" ADD CONSTRAINT "market_trades_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "player_markets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
