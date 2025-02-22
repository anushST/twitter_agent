import { Post } from "../../../entities/table.ts";
import { database } from "../../../database/index.ts";
import { calculateContextScore } from "./context_analyze.ts";

export type PostData = {
    text: string;
    likes: number;        // Количество лайков
    retweets: number;     // Количество ретвитов
    replies: number;      // Количество ответов (реплаев)
    views: number;        // Количество просмотров
    bookmarks: number;    // Количество закладок
    datePosted: Date;       // Дата и время публикации
};

export type AverageMetrics = {
    avgLikes: number;       // Среднее количество лайков
    avgRetweets: number;    // Среднее количество ретвитов
    avgReplies: number;     // Среднее количество ответов (реплаев)
    avgViews: number;       // Среднее количество просмотров
    avgBookmarks: number;   // Среднее количество закладок
};

function calculateTimeliness(postTime: Date, threshold: number = 72): number {    
    const currentTime = new Date();
    const deltaT = (currentTime.getTime() - postTime.getTime()) / (1000 * 60 * 60);

    const T = Math.max(0, 1 - deltaT / threshold);

    return parseFloat(T.toFixed(3));
}

function calculateVirality(post: PostData): number {    
    const currentTime = new Date();
    const deltaT = (currentTime.getTime() - new Date(post.datePosted).getTime()) / (1000 * 60);
    if (deltaT < 1) return 0;

    const growthRate = (post.likes + post.retweets + post.replies) / (deltaT / 8);

    const V = Math.log(growthRate + 1);
    
    const normalizedV = Math.min(1, V / 5);

    return parseFloat(normalizedV.toFixed(3));
}

export async function getAverageMetrics(authorName: string) {
    const postRepository = database.getRepository(Post);

    const result = await postRepository
        .createQueryBuilder("post")
        .select("AVG(post.likes)", "avgLikes")
        .addSelect("AVG(post.retweets)", "avgRetweets")
        .addSelect("AVG(post.replies)", "avgReplies")
        .addSelect("AVG(post.views)", "avgViews")
        .addSelect("AVG(post.bookmarks)", "avgBookmarks")
        .where("post.username = :authorName", { authorName })
        .getRawOne();

    if (!result) {
        return null;
    }

    const avgMetrics: AverageMetrics = {
        avgLikes: Math.round(result.avgLikes || 0),
        avgRetweets: Math.round(result.avgRetweets || 0),
        avgReplies: Math.round(result.avgReplies || 0),
        avgViews: Math.round(result.avgViews || 0),
        avgBookmarks: Math.round(result.avgBookmarks || 0),
    };

    return avgMetrics;
}

const weights = {
    wL: 0.3,
    wR: 0.2,
    wP: 0.1,
    wV: 0.3,
    wB: 0.1
};

function calculateEngagementScore(post: PostData, avgMetrics: AverageMetrics, M: number = 3): number {
    function relativeMetric(value: number, avgValue: number): number {
        return Math.log(value + 1) / Math.log(avgValue + 1);
    }

    const rL = relativeMetric(post.likes, avgMetrics.avgLikes);
    const rR = relativeMetric(post.retweets, avgMetrics.avgRetweets);
    const rP = relativeMetric(post.replies, avgMetrics.avgReplies);
    const rV = relativeMetric(post.views, avgMetrics.avgViews);
    const rB = relativeMetric(post.bookmarks, avgMetrics.avgBookmarks);

    const E_rel = (weights.wL * rL + weights.wR * rR + weights.wP * rP + weights.wV * rV + weights.wB * rB);

    const E_norm = Math.min(1, E_rel / M);

    return parseFloat(E_norm.toFixed(3));
}

export async function calculateRate(post: PostData): Promise<number> {
    // const T = calculateTimeliness(post.datePosted);
    // const E = calculateEngagementScore(post, avgMetrics);
    const V = calculateVirality(post);
    const C = await calculateContextScore(post.text);

    console.log(`V: ${V}, C: ${C}`);

    const TweetValueScore = (V * 40) + (C * 60);

    return parseFloat(TweetValueScore.toFixed(2));
}
