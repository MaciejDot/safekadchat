export default function random(){
    return {
        randomArray(bytes: number){
            const array = new Uint8Array(bytes);
            crypto.getRandomValues(array)
            return array;
        }
    }
}