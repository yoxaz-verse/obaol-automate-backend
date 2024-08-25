import app from "./app";
import { NODE_ENV, PORT } from "./config";
import connectDB from "./database/connection";
import { prefix } from "./routes";

const port = PORT || 3000;
async function startServer() {
  await connectDB();
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log(`Environment: ${NODE_ENV}`);
    console.log(`http://localhost:${port}/api${prefix}/`);
  });
}

startServer();