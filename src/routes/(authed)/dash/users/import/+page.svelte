<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import CheckCircle from '@lucide/svelte/icons/check-circle';

	interface Props {
		data: PageData;
		form: ActionData;
	}
	let { data, form }: Props = $props();

	let selectedPids: Set<number> = $state(new Set());
	let loading = $state(false);

	const localUserIds = new Set(data.localUserIds);

	function toggleUser(pid: number) {
		if (selectedPids.has(pid)) {
			selectedPids.delete(pid);
		} else {
			selectedPids.add(pid);
		}
		selectedPids = new Set(selectedPids);
	}

	function selectAll() {
		selectedPids = new Set(data.vnercapUsers.map((u) => u.pid));
	}

	function selectNone() {
		selectedPids = new Set();
	}

	function selectNew() {
		selectedPids = new Set(
			data.vnercapUsers.filter((u) => !localUserIds.has(u.pid)).map((u) => u.pid)
		);
	}

	$effect(() => {
		if (form?.success) {
			toast.success(`Imported ${form.imported} user(s)`);
			if (form.errors?.length > 0) {
				form.errors.forEach((e: string) => toast.error(e));
			}
		} else if (form?.error) {
			toast.error(form.error);
		}
	});
</script>

<div class="max-w-5xl">
	<Card.Root>
		<Card.Header>
			<Card.Title>Import Users from vNERCAP</Card.Title>
			<Card.Description>
				Fetch and import users from the vNERCAP API into the local database.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if data.fetchError}
				<div class="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg mb-4">
					<AlertCircle class="size-5" />
					<span>{data.fetchError}</span>
				</div>
			{:else if data.vnercapUsers.length === 0}
				<div class="flex items-center gap-2 p-4 bg-yellow-50 text-yellow-700 rounded-lg">
					<AlertCircle class="size-5" />
					<span>No users found in vNERCAP.</span>
				</div>
			{:else}
				<div class="flex gap-2 mb-4">
					<Button variant="outline" size="sm" onclick={selectAll}>Select All</Button>
					<Button variant="outline" size="sm" onclick={selectNone}>Select None</Button>
					<Button variant="outline" size="sm" onclick={selectNew}>Select New Only</Button>
					<span class="ml-auto text-sm text-muted-foreground">
						{selectedPids.size} selected / {data.vnercapUsers.length} total
					</span>
				</div>

				<form
					method="POST"
					action="?/import"
					use:enhance={() => {
						loading = true;
						return async ({ update }) => {
							loading = false;
							await update();
						};
					}}
				>
					{#each Array.from(selectedPids) as pid}
						<input type="hidden" name="pid" value={pid} />
					{/each}

					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head class="w-12"></Table.Head>
								<Table.Head>PID</Table.Head>
								<Table.Head>Name</Table.Head>
								<Table.Head>Rank</Table.Head>
								<Table.Head>Discord</Table.Head>
								<Table.Head>Status</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each data.vnercapUsers as user}
								{@const isLocal = localUserIds.has(user.pid)}
								<Table.Row class={isLocal ? 'bg-green-50' : ''}>
									<Table.Cell>
										<Checkbox
											checked={selectedPids.has(user.pid)}
											onCheckedChange={() => toggleUser(user.pid)}
										/>
									</Table.Cell>
									<Table.Cell class="font-mono">{user.pid}</Table.Cell>
									<Table.Cell>{user.fname} {user.lname}</Table.Cell>
									<Table.Cell>{user.rank || '-'}</Table.Cell>
									<Table.Cell class="font-mono text-sm">
										{user.discordId || '-'}
									</Table.Cell>
									<Table.Cell>
										{#if isLocal}
											<Badge class="bg-green-100 text-green-800 hover:bg-green-100">
												<CheckCircle class="size-3 mr-1" /> Imported
											</Badge>
										{:else if user.isActive}
											<Badge variant="outline">Active</Badge>
										{:else}
											<Badge variant="secondary">Inactive</Badge>
										{/if}
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>

					<div class="mt-4 flex gap-2">
						<Button type="submit" disabled={selectedPids.size === 0 || loading}>
							{#if loading}
								<LoaderCircle class="size-4 animate-spin mr-2" />
							{/if}
							Import {selectedPids.size} User(s)
						</Button>
					</div>
				</form>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
