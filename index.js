import express from 'express'; // Importa el módulo express
const app = express();
const PORT = 3000;

app.use(express.json()); // para poder leer JSON en POST y PUT


app.get('/', (req, res) => {
    res.json('Bienvenido a la API de Juntify');
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });