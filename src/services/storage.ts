import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase/config";

export const storageService = {
  uploadImage: async (file: File, folder: 'clients' | 'team'): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;
    const fileRef = ref(storage, filePath);
    
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
  }
};
