import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const LANGS = ['en', 'fil', 'ceb', 'cbk'] as const;

export class AiChatDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  message!: string;

  @IsOptional()
  @IsIn(LANGS)
  language?: (typeof LANGS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(64)
  conversationId?: string;
}
