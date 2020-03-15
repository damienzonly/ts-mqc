export interface ILocalStorage {
    get: (key: string) => any;
    set: (key: string, data: any) => void;
}

export class LocalStorage implements ILocalStorage {
    get = (key: string) => {
        const item = localStorage.getItem(key);
        try {
            return item ? JSON.parse(item) : item;
        } catch (e) {
            console.error(e.toString());
            return null;
        }
    };

    set = (key: string, data: any) => {
        const payload = JSON.stringify(data);
        localStorage.setItem(key, payload);
    };

    clear = () => {
        localStorage.clear();
    };
}
