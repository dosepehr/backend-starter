import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getDataSourceToken } from '@nestjs/typeorm';
import { BaseEntity, DataSource } from 'typeorm';
import { User } from '../modules/users/entities/user.entity';
import { UserRole } from '../modules/users/enums/user-role.enum';
import { compareHash } from 'utils/funcs/password';
import { UserResource } from './resources/user.resource';
import { FileResource } from './resources/file.resource';

const adminSetup = Promise.all([
  import('@adminjs/nestjs'),
  import('adminjs'),
  import('@adminjs/typeorm'),
]).then(([{ AdminModule: AdminJSModule }, { default: AdminJS }, { Database, Resource }]) => {
  AdminJS.registerAdapter({ Database, Resource });
  return AdminJSModule;
});

@Module({
  imports: [
    adminSetup.then((AdminJSModule) =>
      AdminJSModule.createAdminAsync({
        inject: [ConfigService, getDataSourceToken()],
        useFactory: (
          configService: ConfigService,
          dataSource: DataSource,
        ) => {
          BaseEntity.useDataSource(dataSource);

          const userRepository = dataSource.getRepository(User);

          return {
            adminJsOptions: {
              rootPath: '/admin',
              resources: [UserResource, FileResource],
              branding: {
                companyName: 'Nest Starter',
                withMadeWithLove: false,
              },
            },
            auth: {
              authenticate: async (mobile: string, password: string) => {
                const user = await userRepository
                  .createQueryBuilder('user')
                  .where('user.mobile = :mobile', { mobile })
                  .addSelect('user.password')
                  .getOne();

                if (!user || user.role !== UserRole.ADMIN) return null;

                const valid = await compareHash(password, user.password);
                if (!valid) return null;

                return { email: user.mobile, role: user.role };
              },
              cookieName: 'adminjs',
              cookiePassword:
                configService.getOrThrow<string>('ADMIN_SESSION_SECRET'),
            },
            sessionOptions: {
              secret: configService.getOrThrow<string>('ADMIN_SESSION_SECRET'),
              resave: false,
              saveUninitialized: false,
              cookie: {
                httpOnly: true,
                secure: configService.get('NODE_ENV') === 'production',
                maxAge: 8 * 60 * 60 * 1000,
              },
            },
          };
        },
      }),
    ),
  ],
})
export class AdminModule {}
