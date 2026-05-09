import { IsArray, IsEnum, IsOptional, IsString, MaxLength, MinLength, ArrayMinSize } from 'class-validator';
import { NotificationType } from '@prisma/client';

export class CreateAdminNotificationDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  userIds!: string[];

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;
}
