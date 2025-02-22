import {openai} from "./openai.ts";

const KEYWORDS = [
    "launch", "zkRollup", "Binance", "roadmap", "mainnet", "partnership", 
    "regulation", "Ethereum", "Arbitrum", "SEC", "ETF", "fork",
  
    // Технологии и механики
    "layer2", "staking", "airdrop", "DeFi", "yield farming", "liquidity", "DAO", 
    "smart contract", "EVM", "hashrate", "PoS", "PoW", "zkSync", "Optimism", 
    "rollup", "bridging", "cross-chain", "oracle", "sharding", "consensus", 
    "gas fees", "L1", "L2", "MEV", "on-chain", "off-chain", "sidechain", 
    "interoperability", "modular blockchain", "sequencer", "validator", "node", 
    "slashing", "zero-knowledge proof", "zkEVM", "LST", "modular", "monolithic", 
    "atomic swaps", "block explorer", "multi-sig", "layer3",
  
    // Криптобиржи и трейдинг
    "DEX", "CEX", "leverage", "margin trading", "short squeeze", "perpetuals", 
    "stablecoin", "USDT", "USDC", "tokenomics", "liquidity pool", "market cap", 
    "ATH", "ATL", "pump", "dump", "whale", "FOMO", "FUD", "HODL", "bullish", "bearish",
    "spot trading", "futures", "liquidation", "order book", "market maker", 
    "arbitrage", "impermanent loss", "flash loan", "TVL", "slippage", "VWAP", 
    "DCA", "buy the dip", "sell-off", "retest", "support level", "resistance level",
  
    // NFT, GameFi, SocialFi
    "NFT", "PFP", "Metaverse", "play-to-earn", "GameFi", "RWA", "staking rewards",
    "SocialFi", "creator economy", "soulbound token", "NFT marketplace", "fractional NFT",
    "on-chain identity", "ENS", "domain names",
  
    // Регуляция и тренды
    "CBDC", "KYC", "AML", "compliance", "sanctions", "Gensler", "lawsuit", 
    "crypto bill", "MiCA", "stablecoin regulation", "legislation", "crypto tax",
    "blacklist", "whitelist", "SEC lawsuit", "financial freedom", "privacy coin"
  ];

const WEIGHT_KEYWORDS = 0.3;
const WEIGHT_EMBEDDING = 0.5;
const WEIGHT_SENTIMENT = 0.2;

function calculateKeywordFactor(tweet: string): number {
    let matches = KEYWORDS.filter(keyword => tweet.toLowerCase().includes(keyword.toLowerCase())).length;

    if (matches >= 3) {
        return 1;
    } else if (matches === 2) {
        return 0.8;
    } else if (matches === 1) {
        return 0.6;
    } else {
        return 0;
    }
}

async function getEmbeddingFactor(tweet: string): Promise<number> {
    const classificationResponse = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
            { role: "system", content: "Ты анализатор твитов. Оцени, является ли твит крупным анонсом (по шкале от 0 до 1), где 1 — это значительный анонс, 0 — просто мнение." },
            { role: "user", content: `Твит: "${tweet}". Вероятность крупного анонса?` }
        ],
        max_tokens: 10
    });

    const score = parseFloat(classificationResponse.choices[0].message.content);
    return isNaN(score) ? 0 : Math.min(1, score);
}

async function getSentimentFactor(tweet: string): Promise<number> {
    const sentimentResponse = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
            { role: "system", content: "Ты анализатор тональности. Оцени твит по шкале 0 (нейтральный) до 1 (очень важный или критически негативный)." },
            { role: "user", content: `Твит: "${tweet}". Оцени важность по шкале 0-1.` }
        ],
        max_tokens: 10
    });

    const sentimentScore = parseFloat(sentimentResponse.choices[0].message.content);
    return isNaN(sentimentScore) ? 0 : Math.min(1, sentimentScore);
}

export async function calculateContextScore(tweet: string): Promise<number> {
    const keywordFactor = calculateKeywordFactor(tweet);
    const embeddingFactor = await getEmbeddingFactor(tweet);
    const sentimentFactor = await getSentimentFactor(tweet);

    console.log(`Keyword factor: ${keywordFactor}, Embedding factor: ${embeddingFactor}, Sentiment factor: ${sentimentFactor}`);

    const contextScore = (WEIGHT_KEYWORDS * keywordFactor) +
                         (WEIGHT_EMBEDDING * embeddingFactor) +
                         (WEIGHT_SENTIMENT * sentimentFactor);

    return parseFloat(contextScore.toFixed(3));
}
