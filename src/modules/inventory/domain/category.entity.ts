export interface Category {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type NewCategory = Pick<Category, 'name' | 'description'>;
export type CategoryChanges = Partial<NewCategory>;
