import { Context, Schema } from 'koishi';
export declare const name = "count-group-name";
export declare const inject: string[];
export interface Config {
    watchGroups: string[];
    maxRecords: number;
}
export declare const Config: Schema<Config>;
declare module 'koishi' {
    interface Tables {
        group_name_history: GroupNameHistory;
    }
}
export interface GroupNameHistory {
    id: number;
    group_id: string;
    group_name: string;
    operator_id?: string;
    changed_at: Date;
}
export declare function apply(ctx: Context, config: Config): void;
