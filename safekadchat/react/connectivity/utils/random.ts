import encoding from "./encoding";

//polyfill webcrypto
export default function random(){
    return {
        randomSalt(bytes = 20){
            /*change for crypto random safe*/
            const array = new Uint8Array(bytes);
            for(let index =0; index<array.length; index++) array[index] = Math.floor(Math.random()* 256)
            return encoding('base64').transformToString(array);
        }
    }
}