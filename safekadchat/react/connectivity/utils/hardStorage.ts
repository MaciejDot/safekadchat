import AsyncStorage from "@react-native-community/async-storage";


function hardStorage(){

    const _cache = new Map<string, string>();
    
    AsyncStorage.getAllKeys().then(AsyncStorage.multiGet)
        .then((pairs) => pairs.forEach(([key, value]) => value && _cache.set(key, value)))
    
/*
root -> users -> salt -> internalId 

alfa ->




*/

    return {
        setItem(key : string, value: string)
        {}

    }
};
export default hardStorage();