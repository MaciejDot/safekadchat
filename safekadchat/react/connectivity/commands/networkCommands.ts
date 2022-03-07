import SHA1String from "../types/SHA1String";
import commandsFactory from "./commandsFactory";

/*  --- ON HASH MISTAKE REJECT ALL ---  */
const networkLevelCommandsValidator = {
    "FULL": (args: [string]) => 
        args.length === 1 ? 
        args:
        undefined,
    "PARTITION": (args:string[]) => 
        { 
            if(args.length !== 4)
                return undefined;

            if(Number.isNaN(Number(args[1])))
            return [args[0], Number(args[1]), Number(args[2]), args[3]] as const
        } 
} 

const networkLevelCommands = {

};

const networkLevelFactory = {
    FULL:(message: string) => commandsFactory('FULL', message),
    PARTITION:(message: string, number: number, all: number, fullHash: SHA1String) => 
    commandsFactory('PARTITION', message, number, all, fullHash),
    RESEND_PARTITION: (fullHash:SHA1String, number:number) => 
    commandsFactory('RESEND_PARTITION',  fullHash, number),
    DIDNOT_UNDERSTAND: () => commandsFactory('DIDNOT_UNDERSTAND'),
    CANT_FROM_CACHE: (fullHash: SHA1String, number:number) => commandsFactory(`CANT_FROM_CACHE`, fullHash, number)
} as const

export { networkLevelFactory, networkLevelCommandsValidator };