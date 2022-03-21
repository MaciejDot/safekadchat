import encoding from "./encoding"

export default function signing(){
    return {
        generateSignKey,
        sign,
        verify,
        signString,
        verifyString,
        exportKey,
        exportKeyAsString,
        importPrivateKey,
        importPublicKey,
        importPrivateKeyString,
        importPublicKeyString,
        importWrappedPrivate,
        importWrappedPrivateString,
        importWrappedPublic,
        importWrappedPublicString,
        exportWrapped,
        signSize,
        rawPublicKeySize,
        exportWrappedAsString
    }

    function signSize(){
        return 132;
    }

    function rawPublicKeySize(){
        return 133;
    }

    function importWrappedPrivateString(wrappedKey: string , unwrappingKey:CryptoKey, inEncoding: BufferEncoding = 'base64')
    {
        return importWrappedPublic(encoding(inEncoding).transformToArrayBuffer(wrappedKey), unwrappingKey);
    }

    function importWrappedPrivate(wrappedKey: ArrayBuffer, unwrappingKey:CryptoKey)
    {
        return crypto.subtle.unwrapKey('raw', wrappedKey, unwrappingKey,  
         { "name": "AES-KW", "length": 256},
         {name: 'ECDSA', namedCurve: 'P-521'},
         true,
         ['sign', 'verify']
        )
    }
    function importWrappedPublicString(wrappedKey: string , unwrappingKey:CryptoKey, inEncoding: BufferEncoding = 'base64')
    {
        return importWrappedPublic(encoding(inEncoding).transformToArrayBuffer(wrappedKey), unwrappingKey);
    }

    function importWrappedPublic(wrappedKey: ArrayBuffer, unwrappingKey:CryptoKey)
    {
        return crypto.subtle.unwrapKey('raw', wrappedKey, unwrappingKey,  
         { "name": "AES-KW", "length": 256},
         {name: 'ECDSA', namedCurve: 'P-521'},
         true,
         [ 'verify']
        )
    }

    async function exportWrappedAsString(keyBeingWrapped:CryptoKey,
        wrappingKey:CryptoKey,
        outEncoding: BufferEncoding = 'base64')
        {
            return encoding(outEncoding).transformToString(await exportWrapped(keyBeingWrapped, wrappingKey))
        }

    function exportWrapped(keyBeingWrapped:CryptoKey,wrappingKey:CryptoKey){
        return crypto.subtle.wrapKey('raw', keyBeingWrapped, wrappingKey,   { "name": "AES-KW", "length": 256})
    }
    function generateSignKey(){
            return crypto.subtle.generateKey({ name:'ECDSA', namedCurve:'P-521' }, true, ['sign', 'verify'])
    };

    async function exportKeyAsString(key: CryptoKey, outEncoding: BufferEncoding = 'base64')
    {
        return encoding(outEncoding).transformToString(await exportKey(key))
    }
    function exportKey(key: CryptoKey){
        return crypto.subtle.exportKey("raw", key)
    }

    function importPrivateKeyString(key: string, inEncoding: BufferEncoding = 'base64'){
        return importPrivateKey(encoding(inEncoding).transformToArrayBuffer(key));
    }
    function importPublicKeyString(key: string, inEncoding: BufferEncoding = 'base64'){
        return importPublicKey(encoding(inEncoding).transformToArrayBuffer(key));
    }
    function importPrivateKey(key: ArrayBuffer){
        return crypto.subtle.importKey('raw', key, { name:'ECDSA', namedCurve:'P-521' }, true, ['sign' , 'verify'])
    }

    function importPublicKey(key: ArrayBuffer){
        return crypto.subtle.importKey('raw', key, { name:'ECDSA', namedCurve:'P-521' }, true, [ 'verify'])
    }

    async function signString(message: string, privateKey: CryptoKey,  inEncoding: BufferEncoding = 'utf-8', outEncoding: BufferEncoding = 'base64')
    {
        const signature = await sign(encoding(inEncoding).transformToArrayBuffer(message), privateKey);
        return encoding(outEncoding).transformToString(signature)
    }
    
    function sign(message: ArrayBuffer, privateKey: CryptoKey){
            return crypto.subtle.sign({name: 'ECDSA', hash:'SHA-256'}, privateKey, message)
        };
    
        async function verifyString(message: string, signature:string, publicKey: CryptoKey,  messageEncoding: BufferEncoding = 'utf-8', signatureEncoding: BufferEncoding = 'base64')
        {
            return await verify(
                encoding(messageEncoding).transformToArrayBuffer(message),
            encoding(signatureEncoding).transformToArrayBuffer(signature)
            , publicKey);
        }

        function verify(message: ArrayBuffer, signature: ArrayBuffer, publicKey: CryptoKey){
            return crypto.subtle.verify({name: 'ECDSA', hash:'SHA-256'}, publicKey, signature, message)
        };
    
}