import { app } from './app';
import { env } from './env';

app.listen(env.PORT, () => {
  console.log(`[server] up on http://localhost:${env.PORT}`);
});
