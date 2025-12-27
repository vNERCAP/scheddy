<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { superForm } from 'sveltekit-superforms';
	import { toast } from 'svelte-sonner';
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import { Checkbox } from '$lib/components/ui/checkbox';

	interface Props {
		data: PageData;
	}
	let { data }: Props = $props();

	const form = superForm(data.form, {
		async onUpdated({ form }) {
			if (form.valid) {
				await goto('/dash/types');
				toast.success('Session type updated!');
			}
		}
	});

	const { form: formData, enhance, delayed } = form;

	$inspect($formData);
</script>

<form class="max-w-3xl" method="POST" use:enhance>
	<Form.Field {form} name="name">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>Name</Form.Label>
				<Input {...props} bind:value={$formData.name} />
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>
	<Form.Field {form} name="category">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>Category</Form.Label>
				<Input {...props} bind:value={$formData.category} />
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>
	<Form.Field {form} name="length">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>Length (Minutes)</Form.Label>
				<Input {...props} type="number" bind:value={$formData.length} />
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>
	<Form.Field {form} name="order">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>Ordering (lowest first)</Form.Label>
				<Input {...props} type="number" bind:value={$formData.order} />
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>
	<Form.Field {form} name="bookable" class="mb-2">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>Bookable</Form.Label>
				<Checkbox {...props} bind:checked={$formData.bookable} />
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>
	<Form.Button>
		{#if $delayed}
			<LoaderCircle class="size-4 animate-spin" />
		{:else}
			Save
		{/if}
	</Form.Button>
</form>
