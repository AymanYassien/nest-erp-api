import { INestApplication, RequestMethod } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const API_PREFIX = 'api/v1';

/** Settings shared by main.ts and the e2e tests so both run the same app. */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix(API_PREFIX, {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });
  app.enableShutdownHooks();
}

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Nest ERP API')
    .setDescription(
      'Mini ERP: users, inventory and orders. Authenticate via `POST /api/v1/auth/login`, then click **Authorize** and paste the access token.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });
}
