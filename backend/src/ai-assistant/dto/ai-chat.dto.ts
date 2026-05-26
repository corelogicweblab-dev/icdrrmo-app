import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

const LANGS = ['en', 'fil', 'ceb', 'cbk'] as const;

export class AiChatHistoryItemDto {
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content!: string;
}

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

  /** Prior turns in this chat (newest message is `message`). */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => AiChatHistoryItemDto)
  history?: AiChatHistoryItemDto[];
}
