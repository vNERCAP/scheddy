<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { clientConfig } from '$lib/config/client';
	import MessageCircle from '@lucide/svelte/icons/message-circle';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
</script>

{#if data.success}
	<p>Logged in successfully. You'll be redirected in a moment!</p>
{:else if data.error_code === 'not_registered'}
	<div class="flex flex-col items-center gap-6 max-w-md mx-auto text-center">
		<h1 class="font-bold text-2xl">Account Not Found</h1>
		<p class="text-muted-foreground">
			Your Discord account is not linked to a {clientConfig.facility.name_public} account.
			If you believe this is an error, please contact support on our Discord server.
		</p>
		<div class="flex gap-3">
			<Button href={clientConfig.facility.discord_url_public} target="_blank">
				<MessageCircle class="size-4 mr-2" />
				Join Discord
			</Button>
			<Button href="/" variant="outline">Try Again</Button>
		</div>
	</div>
{:else}
	<div class="flex flex-col items-center gap-4 max-w-md mx-auto text-center">
		<h1 class="font-bold text-2xl">Something went wrong</h1>
		<p class="text-muted-foreground">{data.error_message}</p>
		<p class="text-xs text-muted-foreground">Error code: {data.error_code}</p>
		<Button href="/">Try again</Button>
	</div>
{/if}
