// Shapes returned by the Sverse API (code/backend/src/modules/*/services presenters).
// `*Units` are integer strings and are authoritative; `*Srv` / `*UsdSnapshot` are display helpers.

export type Tier = 'T0' | 'T1' | 'T2' | 'T3'
export type ChainStatus = 'none' | 'pending' | 'confirmed' | 'failed' | string

export interface CollectionMeta {
  nextCursor: string | null
  hasMore: boolean
  count: number
  [key: string]: unknown
}

export interface Collection<T> {
  data: T[]
  meta: CollectionMeta
}

export interface SessionUser {
  id: string
  handle: string
  displayHandle?: string
  email: string
  emailVerified: boolean
  roles: string[]
  status: string
  custodialAddress: string | null
  reputation: number
  skill?: { tier?: string; firstClears?: number; tournamentBest?: string } | null
  inventory: { count: number; gameCount: number }
  wardrobe: { highestTier: Tier; renderTargets: number; equipped: number }
  creator: { studioId: string; handle: string; displayName: string; status: string } | null
  studio: { id: string; handle: string; displayName: string } | null
  balanceUnits: string
  balanceSrv: string
  faucet: { enabled: boolean; availableAt: string | null }
  createdAt: string
}

export interface StudioSummary {
  id: string
  handle: string
  displayName: string
  oneHumanStudio?: boolean
  genesis?: boolean
  avatarUrl?: string | null
  bio?: string
}

export interface GameStats {
  playersLive: number
  dau: number
  mau: number
  playtimeMinutes: number
  proofOfPlayScore: number
}

export interface GameSummary {
  id: string
  slug: string
  title: string
  blurb?: string
  genre: string
  studio: StudioSummary
  coverArt?: { url?: string; gradient?: string; emoji?: string }
  interopTier: Tier
  tokenizationLevel: string
  stats: GameStats
  statsSource: 'seed' | 'live' | string
  priceFromUnits: string | null
  priceFromSrv: string | null
  status: string
  mine: boolean
  publishedAt: string | null
}

export interface GameDetail extends GameSummary {
  description?: string
  media?: Array<{ url: string; kind: string; order: number }>
  buildType?: string
  buildUrl?: string
  club?: { id: string; memberCount: number; postCount: number; postRequiresOwnership: boolean } | null
  secondaryCount: number
}

export interface ItemDefinition {
  id: string
  sku: string
  name: string
  description?: string
  kind: string
  priceUnits: string
  priceSrv: string
  priceUsdSnapshot: string
  interopTier: Tier
  tokenizationLevel: string
  schemaId: string | null
  slot: string | null
  traits: Record<string, unknown>
  transferable: boolean
  stackable: boolean
  royaltyBps: number
  supply: { type: string; max: number | null; minted: number; remaining: number | null }
  art?: { url?: string; emoji?: string }
  chain?: { definitionId: string | null; status: ChainStatus }
  status: string
  owned: boolean
}

export interface FeeBreakdown {
  feeBps: number
  studioUnits: string
  protocolUnits: string
  burnUnits: string
  creatorRewardsUnits: string
  playerRewardsUnits: string
  treasuryUnits: string
  curatorUnits: string
}

export interface CheckoutIntent {
  id: string
  status: string
  item: { id: string; name: string; kind: string; art?: { url?: string } }
  game: { id: string; slug: string; title: string; studioHandle: string }
  quantity: number
  paymentMethod: string
  quote: { priceUnits: string; priceSrv: string; usdAmount: string; rateSnapshot: string; expiresAt: string }
  feeBreakdown: FeeBreakdown
}

export interface CheckoutCompleted {
  id: string
  status: string
  settledAt: string | null
  txHash: string | null
  chain: { status: ChainStatus; txHash: string | null; explorerUrl: string | null; opStatus: string | null }
  inventoryItem: { id: string; tokenId: string | null; name: string } | null
  itemDefinitionId: string
  balanceUnits: string
  balanceSrv: string
}

export interface RenderTarget {
  gameId: string
  slug: string
  title: string
  tier: Tier
}

export interface InventoryItem {
  id: string
  itemDefinitionId: string
  name: string
  sku: string
  kind: string
  game: { id: string; slug: string; title: string }
  tokenId: string | null
  interopTier: Tier
  schemaId: string | null
  slot: string | null
  imageUrl: string
  traits: Record<string, unknown>
  deedCount: number
  quantity: number
  equipped: boolean
  listed: boolean
  transferable: boolean
  status: string
  acquiredVia: string
  acquiredAt: string
  renderTargets: RenderTarget[]
  chain: { status: ChainStatus; txHash: string | null; explorerUrl: string | null; ownerAddress?: string | null }
}

export interface Wardrobe {
  equipped: InventoryItem[]
  candidates: InventoryItem[]
  renderTargets: RenderTarget[] | number
}

export interface Listing {
  id: string
  status: string
  inventoryItemId: string | null
  name: string
  imageUrl: string
  game: { id: string; slug: string; title: string } | null
  gameSlug: string | null
  schemaId: string | null
  kind?: string
  interopTier?: Tier
  tokenId: string | null
  traits: Record<string, unknown>
  priceUnits: string
  priceSrv: string
  priceUsdSnapshot: string
  royaltyBps: number
  protocolBps: number
  deedCount: number
  verifiedDeedCount: number
  seller: { id: string; handle: string; reputation: number } | null
  chain: { status: ChainStatus; txHash: string | null; explorerUrl?: string | null }
  soldAt: string | null
  createdAt: string
}

export interface ListingBuyResult {
  listing: Listing
  inventoryItemId: string | null
  balanceUnits: string
  balanceSrv: string
}

export interface Deed {
  id: string
  inventoryItemId: string
  itemName: string
  schemaId: string | null
  deedType: string
  detail: Record<string, unknown> | string | null
  traitsBefore: Record<string, unknown> | null
  traitsAfter: Record<string, unknown> | null
  epoch: number | string | null
  verified: boolean | null
  verificationNote?: string | null
  studioAttested?: boolean
  sverseWitness?: boolean
  chain: { status: ChainStatus; txHash: string | null; explorerUrl: string | null; chainDeedId?: string | null }
  createdAt: string
}

export interface ClubInfo {
  id: string
  name: string
  memberCount: number
  postCount: number
  postRequiresOwnership: boolean
  channels: Array<{ key: string; name: string; gated: boolean }>
  canPost: boolean
}

export interface ClubPost {
  id: string
  kind: 'post' | 'reply' | 'deed_auto' | string
  channel: string
  parentId: string | null
  body: string
  badges: string[]
  repAtPost: number
  weight: number
  lowSignal: boolean
  score: number
  reactions: { up: number; insightful: number }
  replyCount: number
  status: string
  author: { id: string | null; handle: string; reputation: number }
  viewerReactions: string[]
  createdAt: string
}

export interface RewardChannel {
  channel: string
  sharePct: number
  amountUnits: string
  amountSrv: string
  note?: string
}

export interface RewardClaim {
  id: string
  epochNumber: number
  amountUnits: string
  amountSrv: string
  status: 'unclaimed' | 'claimed' | string
  channels: RewardChannel[]
  score: number
  claimedAt: string | null
}

export interface RewardEpoch {
  id: string
  number: number
  status: 'open' | 'closing' | 'published' | string
  startAt: string
  endAt: string
  feeRevenueUnits: string
  bootstrapEmissionUnits: string
  playerPoolUnits: string
  creatorPoolUnits: string
  distributedUnits: string
  channelSplit: Record<string, number>
  participants: { players: number; studios: number }
  merkleRoot: string | null
  publishMerkleTxHash: string | null
  explorerUrl: string | null
  claimDeadline: string | null
  closedAt: string | null
  fundedBy: string
  projected?: { feeRevenueUnits: string; playerPoolUnits: string; creatorPoolUnits: string }
}

export interface PassportRewards {
  epoch: RewardEpoch | null
  current: RewardEpoch | null
  myClaim: RewardClaim | null
  claims: RewardClaim[]
  unclaimedUnits: string
}

export interface ClaimResult {
  epochId: string
  claimId: string
  claimed: boolean
  amountUnits: string
  amountSrv: string
  balanceUnits: string
  balanceSrv: string
}

export interface Order {
  id: string
  status: string
  sku: string
  quantity: number
  channel: string
  paymentMethod: string
  item?: { id: string; name: string; art?: { url?: string } }
  game?: { id: string; slug: string; title: string }
  quote: { priceUnits: string; priceSrv: string; usdAmount: string; expiresAt: string }
  feeBreakdown: Partial<FeeBreakdown>
  failureCode?: string | null
  txHash?: string | null
  explorerUrl?: string | null
  settledAt?: string | null
  refundedAt?: string | null
  createdAt: string
}

export interface InteropCheck {
  name: string
  passed: boolean
  detail: string
}

export interface InteropPreview {
  dryRun: boolean
  feeUnits: string
  feeSrv: string
  checks: InteropCheck[]
  source: Record<string, unknown>
  envelope: {
    acceptsTierMax: Tier
    schemaId: string | null
    tierMax: Tier | null
    powerTierRange: [number, number] | null
    bands: Record<string, [number, number]>
    clampPolicy: string
  }
  mapped: Record<string, unknown>
  deedsCarried: number
  host: { id: string; slug: string; title: string }
  id?: string
}

export interface ChainInfo {
  adapter: string
  chainId: number
  network: string
  explorer: string | null
  contracts: Record<string, string> | null
  indexedBlock: number | null
}

export interface FaucetResult {
  creditedUnits: string
  creditedSrv: string
  balanceUnits: string
  balanceSrv: string
}
