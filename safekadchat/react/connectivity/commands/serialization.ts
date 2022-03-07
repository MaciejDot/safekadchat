import { AllCommands } from "./CommandType";
const delimitter = '\00'

function serializeCommand(command : AllCommands) {
    //for ts
    const {type, args} = command;
    const reduced = (args as any).reduce((a : any, b: any) => `${a}${delimitter}${b}`, '') as string
    return `${type}${delimitter}${reduced}` as const
}

function deserializeCommand(text: string) : AllCommands {
    const splitted = text.split(delimitter);
    return {
        type: splitted[0]
    } as const
}