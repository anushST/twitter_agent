import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity() // Определяет таблицу
export class Post {
    @PrimaryGeneratedColumn() // Автоинкрементный ID
    id: number;

    @Column() // Обычное текстовое поле
    post_id: string;

    @Column() // Обычное текстовое поле
    username: string;

    @Column() // Обычное текстовое поле
    likes: number;

    @Column() // Обычное текстовое поле
    retweets: number;

    @Column()
    bookmarks: number;

    @Column() // Обычное текстовое поле
    replies: number;

    @Column() // Обычное текстовое поле
    text: string;

    @Column("real")
    rate: number;

    @Column()
    views: number;

    @Column()
    datePosted: Date;

    @Column({ default: () => "CURRENT_TIMESTAMP" }) // Дата создания
    createdAt: Date;
}
