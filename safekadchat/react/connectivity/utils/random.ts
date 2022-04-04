import encoding from "./encoding";

//polyfill webcrypto
export default function random(){
    return {
        randomArray(bytes: number){
            /*change for crypto random safe*/
            const array = new Uint8Array(bytes);
            crypto.getRandomValues(array)
            return array;
        }
    }
}