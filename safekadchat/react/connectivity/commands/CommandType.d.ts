import { lowCommandsFactory } from "./lowCommands"
import { networkLevelFactory } from "./networkCommands"

export type CommandType<T> =
    T extends Record<string, (...args: any[])=> infer V> ?
    V : never

export type AllCommands = 
    CommandType<typeof networkLevelFactory>
    | CommandType<typeof lowCommandsFactory>