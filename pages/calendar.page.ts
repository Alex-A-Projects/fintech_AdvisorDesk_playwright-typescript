import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class CalendarPage extends BasePage {
  readonly monthLabel: Locator;
  readonly prevBtn: Locator;
  readonly nextBtn: Locator;
  readonly todayBtn: Locator;
  readonly days: Locator;
  readonly events: Locator;
  readonly addBtn: Locator;
  readonly exportIcs: Locator;

  constructor(page: Page) {
    super(page);
    this.monthLabel = page.locator('#content .cal-month, #content #calLabel, #content .month-label').first();
    this.prevBtn = page.locator('#calPrev');
    this.nextBtn = page.locator('#calNext');
    this.todayBtn = page.locator('#calToday');
    this.days = page.locator('#content .cal-cell, #content [data-day]');
    this.events = page.locator('#content .cal-event, #content [data-ev], #content [data-entity="event"]');
    this.addBtn = page.locator('#content').getByRole('button', { name: /New event|Add event/ }).first();
    this.exportIcs = page.locator('#content button').filter({ hasText: /ICS|Export|Apple|Calendar/ }).first();
  }

  static async open(page: Page): Promise<CalendarPage> {
    const p = new CalendarPage(page);
    await p.goto('calendar');
    return p;
  }

  async assertLoaded(): Promise<void> {
    await expect(this.content).toBeVisible();
  }

  async prevMonth(): Promise<void> {
    await this.prevBtn.click();
  }

  async nextMonth(): Promise<void> {
    await this.nextBtn.click();
  }

  async goToday(): Promise<void> {
    await this.todayBtn.click();
  }

  async monthText(): Promise<string> {
    return (await this.monthLabel.textContent()) ?? '';
  }

  async countDays(): Promise<number> {
    return this.days.count();
  }

  async countEvents(): Promise<number> {
    return this.events.count();
  }

  async clickAdd(): Promise<void> {
    await this.addBtn.click();
  }
}