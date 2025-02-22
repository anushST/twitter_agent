import { SearchMode, type Tweet } from "agent-twitter-client";
import { generateTweet, generateReply } from "./generate_text.ts";
import {elizaLogger} from "@elizaos/core";
import type { ClientBase } from "./base";
import { database } from "../../../database/index.ts";
import { Post } from "../../../entities/table.ts";
import { calculateRate, type AverageMetrics, type PostData, getAverageMetrics } from "./rate.ts";
import {logger} from "./logger.ts";

export class TwitterInteractionClient {
    client: ClientBase;
    private isDryRun: boolean;
    constructor(client: ClientBase) {
        this.client = client;
        this.isDryRun = this.client.twitterConfig.TWITTER_DRY_RUN;
    }

    getRandomInRange(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    

    async start() {
        const MIN_INTERVAL_HOURS = 6;
        const MAX_INTERVAL_HOURS = 10;
        // const POLL_INTERVAL_MS = this.client.twitterConfig.TWITTER_POLL_INTERVAL * 1000;

        // const randomInterval = this.getRandomInRange(
        //     MIN_INTERVAL_HOURS * 60 * 60 * 1000,
        //     MAX_INTERVAL_HOURS * 60 * 60 * 1000
        // )

        while (true) {
            logger.info(`[${new Date().toLocaleTimeString()}] Обрабатываем Twitter...`);
            // Выполняем основную функцию
            await this.handleTwitterInteractions();
    
            // Ожидание перед следующим циклом
            const delay = this.client.twitterConfig.TWITTER_POLL_INTERVAL * 1000; // 2 минуты
            
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        // const handleTwitterInteractionsLoop = () => {
        //     this.handleTwitterInteractions();
        //     setTimeout(
        //         handleTwitterInteractionsLoop,
        //         // Defaults to 2 minutes
        //         this.client.twitterConfig.TWITTER_POLL_INTERVAL * 1000
        //     );
        // };
        // handleTwitterInteractionsLoop();
    }

    async handleTwitterInteractions() {
        elizaLogger.log("Checking Twitter interactions");

        const max_post_amount = 2;
        const max_retweet_amount = 1;
        const max_reply_amount = 3;

        let post_amount = 0;
        let retweet_amount = 0;
        let reply_amount = 0;
    
        try {
            if (this.client.twitterConfig.TWITTER_TARGET_USERS.length) {
                const TARGET_USERS = this.client.twitterConfig.TWITTER_TARGET_USERS;
                elizaLogger.log("Processing target users:", TARGET_USERS);
    
                if (TARGET_USERS.length > 0) {
                    const postRepository = database.getRepository(Post);
    
                    // Обрабатываем всех целевых пользователей
                    for (const username of TARGET_USERS) {
                        try {
                            const userTweets = (
                                await this.client.twitterClient.fetchSearchTweets(
                                    `from:${username}`,
                                    10,
                                    SearchMode.Latest
                                )
                            ).tweets;
    
                            for (const tweet of userTweets) {
                                if (tweet.isQuoted || tweet.isReply || tweet.isRetweet) {
                                    elizaLogger.log(`Tweet ${tweet.id} является Quote/Reply/Retweet, пропускаем`);
                                    continue;
                                }
                                // Проверяем, есть ли уже этот пост в базе
                                const existingPost = await postRepository.findOne({
                                    where: { post_id: tweet.id }
                                });
    
                                if (existingPost) {
                                    elizaLogger.log(`Tweet ${tweet.id} уже существует в базе, пропускаем`);
                                    continue;
                                }

                                const avgMetrics = await getAverageMetrics(username);

                                const datePosted = new Date(tweet.timestamp * 1000);

                                if ((new Date().getTime() - datePosted.getTime()) < 1000 * 60 * 60) {
                                    continue;
                                }

                                const postData: PostData = {
                                    text: tweet.text,
                                    likes: tweet.likes,
                                    retweets: tweet.retweets,
                                    replies: tweet.replies,
                                    views: tweet.views,
                                    bookmarks: tweet.bookmarkCount,
                                    datePosted: datePosted,
                                }
    
                                const rate = await calculateRate(postData);

                                if (!rate) {
                                    elizaLogger.log(`Rate for ${tweet.id} is 0, skipping`);
                                    continue;
                                }
                                if (rate > 85 && post_amount < max_post_amount) {
                                    const text = await generateTweet(tweet.text);
                                    await this.sendTweet(text);
                                    post_amount++;
                                } else if (rate > 80 && retweet_amount < max_retweet_amount) {
                                    await this.retweet(tweet.id);
                                    await this.likeTweet(tweet.id);
                                    retweet_amount++;
                                } else if (rate > 70 && reply_amount < max_reply_amount) {
                                    await this.replyToTweet(tweet.id, "Great tweet!");
                                    await this.likeTweet(tweet.id);
                                    reply_amount++;
                                } else if (rate > 60) {
                                    elizaLogger.log(`Rate for ${tweet.id} is ${rate}, liking tweet`);
                                    await this.likeTweet(tweet.id);
                                }

                                const newPost = postRepository.create({
                                    text: tweet.text,
                                    username: tweet.username,
                                    likes: tweet.likes,
                                    retweets: tweet.retweets,
                                    replies: tweet.replies,
                                    rate: rate,
                                    views: tweet.views,
                                    datePosted: datePosted,
                                    bookmarks: tweet.bookmarkCount,
                                    post_id: tweet.id
                                });
    
                                await postRepository.save(newPost);
                            }
                        } catch (error) {
                            elizaLogger.error(`Error fetching tweets for ${username}:`, error);
                            continue;
                        }
                    }
                }
            } else {
                elizaLogger.log("No target users configured, processing only mentions");
            }

            elizaLogger.log("Finished checking Twitter interactions");
        } catch (error) {
            elizaLogger.error("Error handling Twitter interactions:", error);
        }
    }

    async sendTweet(text: string) {
        if (this.isDryRun) {
            elizaLogger.log("Tweet would be sent:", text);
        } else {
            await this.client.twitterClient.sendTweet(text);
        }
    }

    async likeTweet(tweetId: string) {
        if (this.isDryRun) {
            elizaLogger.log("Tweet would be liked:", tweetId);
        } else {
            await this.client.twitterClient.likeTweet(tweetId);
        }
    }

    async retweet(tweetId: string) {
        if (this.isDryRun) {
            elizaLogger.log("Tweet would be retweeted:", tweetId);
        } else {
            await this.client.twitterClient.retweet(tweetId);
        }
    }

    async replyToTweet(tweetId: string, text: string) {
        if (this.isDryRun) {    
            elizaLogger.log("Reply would be sent:", text);
        }
        else {
            await this.client.twitterClient.sendTweet(text, tweetId);
        }
    }
}