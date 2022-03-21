import encoding from "./encoding";

export default function wrapping(){
    return {
        getSalt,
        encodeSalt,
        decodeSalt,
        getWrapingKey,
        getWrapingKeyStringSalt
    }
    function getSalt(){
        const salt = new Uint8Array(16)
        crypto.getRandomValues(salt);
        return salt;
    };
    function encodeSalt(salt: ArrayBuffer){
        return encoding('base64').transformToString(salt)
    };
    function decodeSalt(salt: string){
        return encoding('base64').transformToArrayBuffer(salt)
    };
    function getWrapingKeyStringSalt(plainTextPassphrase:string, salt:string){
        return getWrapingKey(plainTextPassphrase, decodeSalt(salt));
    }
    async function getWrapingKey(plainTextPassphrase: string, salt: ArrayBuffer){
        const keyMaterial = await crypto.subtle.importKey(
            "raw",
            encoding('utf-8').transformToArrayBuffer(plainTextPassphrase),
            {name: "PBKDF2"},
            false,
            ["deriveBits", "deriveKey"]
          );
        return await crypto.subtle.deriveKey(
            {
              "name": "PBKDF2",
              salt,
              "iterations": 1000000,
              "hash": "SHA-256"
            },
            keyMaterial,
            { "name": "AES-KW", "length": 256},
            true,
            [ "wrapKey", "unwrapKey" ]
          )
    }
}