<script lang="ts">
	import type { TMentor } from './columns';
	import { Badge } from '$lib/components/ui/badge';

	interface Props {
		user: TMentor;
	}
	let { user }: Props = $props();
</script>

<div>
	<span>{user.firstName} {user.lastName}</span>
	{#if !user.isAvailable}
		<Badge class="bg-red-400 text-red-950 hover:bg-red-400 cursor-default"
			>No Availability Set</Badge
		>
	{/if}
</div>
