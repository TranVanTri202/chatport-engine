import { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
export declare class GlobalExceptionFilter implements ExceptionFilter {
    private readonly adapterHost;
    private readonly logger;
    constructor(adapterHost: HttpAdapterHost);
    catch(exception: unknown, host: ArgumentsHost): void;
    private map;
    private mapPrisma;
    private body;
    private codeFromStatus;
}
