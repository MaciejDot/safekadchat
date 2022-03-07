/*APPLICATION LEVEL COMMANDS*/
const encryptedSignedHighLevelCommands = {
    /*direct */
    SEND_CHAT_MESSAGE: (message: string) => `SEND_CHAT_MESSAGE-${message}`,
    /*onion routing turn*/
    //SEND_CHAT_MESSAGE_TURN:  
} as const;
export { encryptedSignedHighLevelCommands }