const fs = require('fs');
const path = require('path');

// Función que elimina archivos con extensión .Identifier
function deleteIdentifierFiles(dir) {
  // Leer el contenido del directorio actual
  fs.readdir(dir, (err, files) => {
    if (err) {
      console.error(`Error al leer el directorio: ${dir}`, err);
      return;
    }

    // Iterar sobre cada archivo o subcarpeta
    files.forEach((file) => {
      const filePath = path.join(dir, file);

      // Obtener información del archivo
      fs.stat(filePath, (err, stats) => {
        if (err) {
          console.error(`Error al obtener información del archivo: ${filePath}`, err);
          return;
        }

        // Si es un directorio, llamar a la función recursivamente
        if (stats.isDirectory()) {
          deleteIdentifierFiles(filePath);
        } else {
          // Si es un archivo con extensión .Identifier, eliminarlo
          if (path.extname(file) === '.Identifier') {
            fs.unlink(filePath, (err) => {
              if (err) {
                console.error(`Error al eliminar archivo: ${filePath}`, err);
              } else {
                console.log(`Archivo eliminado: ${filePath}`);
              }
            });
          }
        }
      });
    });
  });
}

// Ruta del directorio base
const directoryPath = '/home/eduardo/eyeseetea/projects/dataset-configuration';

// Llamada a la función para eliminar los archivos .Identifier
deleteIdentifierFiles(directoryPath);
