const express = require("express");
const bodyParser = require("body-parser");
const sql = require("mssql");
require('dotenv').config()

let isAuthenticated = false;

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

sql
  .connect(dbConfig)
  .catch((err) => console.error("Error al conectar a la base de datos", err));

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

// Endpoint listar usuarios
app.get("/listar-usuarios", async (req, res) => {
  // Consulta SQL vulnerable
  const query = "SELECT id, nombre, email FROM usuarios";

  res.setHeader("Content-Type", "text/html; charset=utf-8");

  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(query);

    if (result.recordset.length > 0) {
      res.write("<h1>Lista de Usuarios</h1>");
      res.write("<table border='1' style='margin: auto; width: 80%; text-align: left; border-collapse: collapse;'>");
      res.write("<tr><th>ID</th><th>Nombre</th><th>Email</th><th>Dirección</th><th>Teléfono</th><th>Tarjeta de Crédito</th></tr>");
      
      result.recordset.forEach((row) => {
        res.write(`
          <tr>
            <td>${row.id}</td>
            <td>${row.nombre}</td>
            <td>${row.email}</td>
            <td>${row.direccion}</td>
            <td>${row.telefono}</td>
            <td>${row.tarjeta_credito}</td>
          </tr>
        `);
      });
      res.write("</table>");
    } else {
      res.send("<h1>No se encontraron usuarios.</h1>");
    }
    res.end();
  } catch (err) {
    console.error("Error en la consulta SQL", err);
    res.status(500).send("Error en el servidor.");
  }
});

// Página de búsqueda de cupones
app.get("/buscar", (req, res) => {
  res.send(`
      <style>
          body {
              font-family: Arial, sans-serif;
              background-color: #f4f4f4;
              margin: 0;
              padding: 20px;
              text-align: center;
          }
          h1 {
              color: #333;
          }
          label {
              display: block;
              margin: 10px 0 5px;
          }
          input[type="text"] {
              width: 300px;
              padding: 10px;
              margin-bottom: 20px;
              border: 1px solid #ccc;
              border-radius: 4px;
          }
          input[type="submit"] {
              padding: 10px 15px;
              background-color: #007bff;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
          }
          input[type="submit"]:hover {
              background-color: #0056b3;
          }
      </style>
      <h1>Búsqueda de Cupones</h1>
      <form action="/resultado-busqueda" method="GET">
          <label for="email">Ingrese su correo electrónico:</label>
          <input type="text" id="email" name="email" placeholder="Ejemplo: usuario@example.com" required>
          <br>
          <input type="submit" value="Buscar">
      </form>
  `);
});

// Ruta para procesar la búsqueda de cupones
app.get("/resultado-busqueda", async (req, res) => {
  const email = req.query.email;

  // Consulta SQL vulnerable
  const query = `
    SELECT 
      c.codigo AS Codigo, 
      c.descripcion AS Descripcion, 
      c.fecha_expiracion AS Expiracion
    FROM cupones c
    JOIN usuarios u ON c.email = u.email
    WHERE u.email = '${email}'`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");

  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(query);

    if (result.recordset.length > 0) {
      res.write("<h1>Resultados de Búsqueda</h1>");
      res.write(
        "<table border='1' style='margin: auto; width: 80%; text-align: left; border-collapse: collapse;'>"
      );
      res.write(
        "<tr><th>Código</th><th>Descripción</th><th>Fecha de Expiración</th><th>Valor</th></tr>"
      );
      result.recordset.forEach((row) => {
        res.write(`<tr>
                      <td>${row.Codigo}</td>
                      <td>${row.Descripcion}</td>
                      <td>${row.Expiracion}</td>
                      <td>$${row.Valor}</td>
                   </tr>`);
      });
      res.write("</table>");
    } else {
      res.send("<h1>No se encontraron cupones para este correo.</h1>");
    }
    res.write(`<p>Consulta ejecutada: ${query}</p>`);
    res.end();
  } catch (err) {
    console.error("Error en la consulta SQL", err);
    res.write(`<p>Consulta ejecutada: ${query}</p>`);
    res.status(500).send("Error en el servidor.");
  }
});

app.get("/", (req, res) => {
  if (!isAuthenticated) {
    return res.send(
      "Acceso denegado. Por favor, inicia sesión primero en /login. Los endpoints que no necesitan autenticación son /listar-usuarios, /buscar y /login"
    );
  }

  res.send(`
          <style>
              body {
                  font-family: Arial, sans-serif;
                  background-color: #f4f4f4;
                  margin: 0;
                  padding: 20px;
                  text-align: center;
              }
              h1 {
                  color: #333;
              }
              label {
                  display: block;
                  margin: 10px 0 5px;
              }
              input[type="email"], input[type="text"] {
                  width: 300px;
                  padding: 10px;
                  margin-bottom: 20px;
                  border: 1px solid #ccc;
                  border-radius: 4px;
              }
              input[type="submit"] {
                  padding: 10px 15px;
                  background-color: #28a745;
                  color: white;
                  border: none;
                  border-radius: 4px;
                  cursor: pointer;
              }
              input[type="submit"]:hover {
                  background-color: #218838;
              }
          </style>
          <h1>Obtén tu cupón de descuento</h1>
          <form action="/procesar-cupon" method="POST">
              <label for="email">Correo Electrónico:</label>
              <input type="email" id="email" name="email" required>
              <label for="coupon">Código de Cupón:</label>
              <input type="text" id="coupon" name="coupon" required>
              <br>
              <input type="submit" value="Enviar">
          </form>
      `);
});

app.get("/login", (req, res) => {
  res.send(`
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f4f4f4;
        margin: 0;
        padding: 20px;
        text-align: center;
      }
      h1 {
        color: #333;
      }
      label {
        display: block;
        margin: 10px 0 5px;
      }
      input[type="text"], input[type="password"] {
        width: 300px;
        padding: 10px;
        margin-bottom: 20px;
        border: 1px solid #ccc;
        border-radius: 4px;
      }
      input[type="submit"] {
        padding: 10px 15px;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      input[type="submit"]:hover {
        background-color: #0056b3;
      }
    </style>
    <h1>Iniciar sesión</h1>
    <form action="/login" method="POST">
      <label for="username">Usuario:</label>
      <input type="text" id="username" name="username" required>
      <label for="password">Contraseña:</label>
      <input type="password" id="password" name="password" required>
      <input type="submit" value="Iniciar sesión">
    </form>
  `);
});

// Endpoint LOGIN
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  // Consulta insegura
  const query = `SELECT * FROM usuarios WHERE nombre = '${username}' AND password = '${password}'`;

  try {
    const pool = await sql.connect(dbConfig);

    const result = await pool.request().query(query);

    if (result.recordset.length > 0) {
      isAuthenticated = true;
      res.redirect("/");
    } else {
      res.send("Usuario o contraseña incorrectos.");
    }
  } catch (err) {
    console.error("Error en la consulta SQL", err);
    res.status(500).send("Error en el servidor");
  }
});

// Endpoint cupones
app.post("/procesar-cupon", async (req, res) => {
  const { email, coupon } = req.body;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  const query = `SELECT * FROM cupones WHERE email = '${email}' AND codigo = '${coupon}'`;

  try {
    const pool = await sql.connect(dbConfig);

    const result = await pool.request().query(query);

    if (result.recordset.length > 0) {
      res.write("¡Cupón válido!<br>");

      // Obtener información del usuario
      const userQuery = `SELECT * FROM usuarios WHERE email = '${email}'`;
      const userResult = await pool.request().query(userQuery);

      if (userResult.recordset.length > 0) {
        const user = userResult.recordset[0];
        res.write("<h3>Datos del Usuario:</h3>");
        res.write("<ul>");
        res.write(`<li><strong>Nombre:</strong> ${user.nombre}</li>`);
        res.write(`<li><strong>Dirección:</strong> ${user.direccion}</li>`);
        res.write(`<li><strong>Teléfono:</strong> ${user.telefono}</li>`);
        res.write(`<li><strong>Contraseña:</strong> ${user.password}</li>`);
        res.write(
          `<li><strong>Tarjeta de crédito:</strong> ${user.tarjeta_credito}</li>`
        );
        res.write("</ul>");
      }

      // Historial de transacciones
      const transQuery = `
        SELECT t.fecha, t.monto 
        FROM transacciones t 
        JOIN usuarios u ON u.id = t.usuario_id 
        WHERE u.email = '${email}'`;

      const transResult = await pool.request().query(transQuery);

      if (transResult.recordset.length > 0) {
        res.write("<br>Historial de transacciones:<br>");
        transResult.recordset.forEach((trans) => {
          res.write(
            `Fecha: ${trans.fecha.toISOString().split("T")[0]} - Monto: $${
              trans.monto
            }<br>`
          );
        });
      }

      // Consultas
      res.write(`<p>Consulta ejecutada: ${query}</p>`);
      res.write(`<p>Consulta usuario: ${userQuery}</p>`);
      res.write(`<p>Consulta transacciones: ${transQuery}</p>`);

      res.end();
    } else {
      res.send("Cupón inválido o correo no registrado.");
    }
  } catch (err) {
    console.error("Error en la consulta SQL", err);
    res.status(500).send("Error en el servidor");
  }
});

// Endpoint UPLOAD
app.post("/upload", (req, res) => {
  if (!req.files || !req.files.file) {
    return res.status(400).send("No se subió ningún archivo");
  }

  const file = req.files.file;
  res.send(`<h3>Archivo cargado:</h3><p>${file.data.toString()}</p>`);
});

// Endpoint COFIGURACION
app.get("/config", (req, res) => {
  res.json(dbConfig);
});

// Iniciar el servidor
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
