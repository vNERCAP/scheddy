import type { ColumnDef } from '@tanstack/table-core';
import { renderComponent } from '$lib/components/ui/data-table';
import DataTableActions from './DataTableActions.svelte';
import DataTableNameDisplay from './DataTableNameDisplay.svelte';

export type TMentor = {
	id: number;
	firstName: string;
	lastName: string;
	mentorAvailability: string | null;
	isAvailable: boolean;
};

export const mentorsCols: ColumnDef<TMentor>[] = [
	{
		id: 'name',
		header: 'Name',
		cell: ({ row }) => {
			return renderComponent(DataTableNameDisplay, { user: row.original });
		}
	},
	{
		id: 'actions',
		cell: ({ row }) => {
			return renderComponent(DataTableActions, row.original);
		}
	}
];
