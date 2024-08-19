import { Controller, Get, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { ScheduleTasksService } from './schedule-tasks/schedule-tasks.service';
import { Throttle } from '@nestjs/throttler';
import { RealEstateAuthGuard } from './auth/guard/RealEstate.guard';

@Controller()
export class AppController {
    constructor(private readonly scheduleService: ScheduleTasksService) { }

    @Throttle({ short: { limit: 2, ttl: 1000 }, long: { limit: 5, ttl: 60000 } })
    @UseGuards(RealEstateAuthGuard)
    @HttpCode(HttpStatus.ACCEPTED)
    @Get('populate_database')
    async populate_database() {
        await this.scheduleService.start_crawler_with_health_check();
        return "Database Started Populating..."
    }
}
