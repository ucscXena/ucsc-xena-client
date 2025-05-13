import helvetica from 'pdfkit/js/data/Helvetica.afm';
import fs from 'fs';

fs.fileData['data/Helvetica.afm'] = helvetica;

export {default} from 'pdfkit';
