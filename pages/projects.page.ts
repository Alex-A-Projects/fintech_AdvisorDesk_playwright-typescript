import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class ProjectsPage extends BasePage {
  readonly addButton: Locator;
  readonly board: Locator;
  readonly listView: Locator;
  readonly viewToggle: Locator;
  readonly filterChips: Locator;
  readonly stageColumns: Locator;
  readonly cards: Locator;

  constructor(page: Page) {
    super(page);
    this.addButton = page.locator('#content #projNew').first();
    this.board = page.locator('#content .board, #content [data-view="board"]');
    this.listView = page.locator('#content .list-view, #content [data-view="list"]');
    this.viewToggle = page.locator('#content .view-toggle button, #content .seg').first();
    this.filterChips = page.locator('#content .filter-chip, #content .chip');
    this.stageColumns = page.locator('#content .stage-col, #content [data-stage]');
    this.cards = page.locator('#content .board-card, #content tr.clickable, #content .project-card, #content [data-entity="project"]');
  }

  static async open(page: Page): Promise<ProjectsPage> {
    const p = new ProjectsPage(page);
    await p.goto('projects');
    return p;
  }

  async assertLoaded(): Promise<void> {
    await expect(this.content).toBeVisible();
  }

  async switchToList(): Promise<void> {
    await this.viewToggle.locator('button').filter({ hasText: /List/ }).first().click();
  }

  async switchToBoard(): Promise<void> {
    await this.viewToggle.locator('button').filter({ hasText: /Board/ }).first().click();
  }

  async clickAdd(): Promise<void> {
    await this.addButton.click();
  }

  async cardByName(name: string): Promise<Locator> {
    return this.cards.filter({ hasText: name }).first();
  }
}

export class ProjectDetailPage extends BasePage {
  readonly title: Locator;
  readonly clientLink: Locator;
  readonly stagePill: Locator;
  readonly valueText: Locator;
  readonly timerButton: Locator;
  readonly completeButton: Locator;
  readonly tasks: Locator;
  readonly timelogs: Locator;

  constructor(page: Page) {
    super(page);
    this.title = page.locator('#content h1').first();
    this.clientLink = page.locator('#content a[href^="#/clients/"]').first();
    this.stagePill = page.locator('#content .pill').first();
    this.valueText = page.locator('#content .prop-v, #content .value').first();
    this.timerButton = page.locator('#content button').filter({ hasText: /Start timer|Stop timer/ }).first();
    this.completeButton = page.locator('#content button').filter({ hasText: /Complete|Done/ }).first();
    this.tasks = page.locator('#content [data-section="tasks"]');
    this.timelogs = page.locator('#content [data-section="timelogs"]');
  }

  async assertLoaded(): Promise<void> {
    await expect(this.title).toBeVisible();
  }

  async startTimer(): Promise<void> {
    await this.timerButton.click();
  }
}