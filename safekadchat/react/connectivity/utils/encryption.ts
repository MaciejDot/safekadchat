import PrivateKey from "../types/PrivateKey"
import PublicKey from "../types/PublicKey"
import * as forge from 'node-forge'
import encoding from "./encoding";
import hashing from "./hashing"
//import crypto from 'react-native-crypto'
//import crypto from 'isomorphic-webcrypto'
/*stateless namespace with shared closure*/
export default function encryption(){
    //use webcrypto from browser or - give up and use RSA
        return {
            generateKey,
            encrypt,
            encryptString,
            secret,
            decrypt,
            decryptString,
            exportKey,
            exportKeyAsString,
            importKey,
            importKeyString,
            exportWrapped,
            exportWrappedAsString,
            importWrapped,
            rawPublicKeySize,
            importWrappedString
        }

        function importWrappedString(wrappedKey: string , unwrappingKey:CryptoKey, inEncoding: BufferEncoding = 'base64')
        {
            return importWrapped(encoding(inEncoding).transformToArrayBuffer(wrappedKey), unwrappingKey);
        }

        function importWrapped(wrappedKey: ArrayBuffer, unwrappingKey:CryptoKey)
        {
            return crypto.subtle.unwrapKey('raw', wrappedKey, unwrappingKey,  
             { "name": "AES-KW", "length": 256},
             {name: 'ECDH', namedCurve: 'P-521'},
             true,
             ['deriveBits', 'deriveKey']
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


        /*  
            import wrapped
            export wrapped
            (with string versions)
        */

        function generateKey(){
           return crypto.subtle.generateKey({name: 'ECDH', namedCurve: 'P-521'},true, ['deriveBits', 'deriveKey']);
        };
        async function exportKeyAsString(key: CryptoKey, outEncoding: BufferEncoding = 'base64')
        {
            return encoding(outEncoding).transformToString(await exportKey(key))
        }
        function exportKey(key: CryptoKey){
            return crypto.subtle.exportKey("raw", key)
        }

        function rawPublicKeySize(){
            return 133;
        }
    
        function importKeyString(key: string, inEncoding: BufferEncoding = 'base64'){
            return importKey(encoding(inEncoding).transformToArrayBuffer(key));
        }
        function importKey(key: ArrayBuffer){
            return crypto.subtle.importKey('raw', key, { name:'ECDH', namedCurve:'P-521' }, true, ['deriveBits', 'deriveKey'])
        }

        function secret(publicKey: CryptoKey, privateKey: CryptoKey, randBits: Uint8Array){
            return crypto.subtle.deriveBits({
                name: "ECDH",
                namedCurve: "P-521",
                public: publicKey
            },
            privateKey, 
            521
        ).then(r=> crypto.subtle.digest('SHA-256', [ ...new Uint8Array(r), ...randBits ]))
        .then(r=> crypto.subtle.importKey('raw', r, {name:'AES-CBC'}, true, ['encrypt', 'decrypt']))
        };
        async function encryptString(message: string, secret: CryptoKey, inEncoding: BufferEncoding = 'utf-8', outEncoding: BufferEncoding = 'base64'){
            const {encrypted, iv} = await encrypt(encoding(inEncoding).transformToArrayBuffer(message), secret);
            return {encrypted:encoding(outEncoding).transformToString(encrypted), iv: encoding(outEncoding).transformToString(iv)}
        };
        async function decryptString(message: {encrypted: string, iv: string}, secret: CryptoKey, inEncoding: BufferEncoding = 'base64', outEncoding: BufferEncoding = 'utf-8') {
            const {encrypted, iv} = message;
            const decrypted = await decrypt({encrypted:encoding(inEncoding).transformToArrayBuffer(encrypted), iv: encoding(inEncoding).transformToArrayBuffer(iv)}, secret)
            return encoding(outEncoding).transformToString(decrypted);
        };
        async function encrypt(message: ArrayBuffer, secret: CryptoKey)
        {
            const iv = new Uint8Array(16);

            crypto.getRandomValues(iv);

            const encrypted = await crypto.subtle.encrypt( {
                name: 'AES-CBC',
                iv
            }, secret, message) ;
            return { encrypted : new Uint8Array(encrypted as ArrayBuffer), iv };
        };
        async function decrypt(message: {encrypted: Uint8Array, iv: Uint8Array}, secret: CryptoKey){
            const {encrypted, iv} = message;

            const decrypted = await crypto.subtle.decrypt( {
                name: 'AES-CBC',
                iv
            }, secret, encrypted);
            return new Uint8Array(decrypted as ArrayBuffer);
        };
    
}