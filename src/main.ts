import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { configureApp, setupSwagger } from './app.setup';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  setupSwagger(app);

  const port = app.get(AppConfigService).get('PORT');
  await app.listen(port);
  Logger.log(
    `API listening on http://localhost:${port} (docs at /docs)`,
    'Bootstrap',
  );
}

void bootstrap();
