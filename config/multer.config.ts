import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuid } from 'uuid';

export function multerStorage(destination: string) {
  return diskStorage({
    destination: `uploads/${destination}`,
    filename: (_, file, cb) => {
      const ext = extname(file.originalname);
      cb(null, `${uuid()}${ext}`);
    },
  });
}
