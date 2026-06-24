<script lang="ts">
	import { env } from '$env/dynamic/public';
	import { SITE } from '$lib/data';
	import { t } from '$lib/i18n';

	// Public, by design (Web3Forms access keys are client-side). Set
	// PUBLIC_WEB3FORMS_ACCESS_KEY in the environment / CI to enable delivery;
	// without it the form falls back to the visitor's mail client.
	const ACCESS_KEY = env.PUBLIC_WEB3FORMS_ACCESS_KEY ?? '';

	let sent = false;
	let sending = false;
	let failed = false;

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		const form = e.currentTarget as HTMLFormElement;
		const data = new FormData(form);

		// No key configured, so open the visitor's email client as a fallback.
		if (!ACCESS_KEY) {
			const subject = encodeURIComponent(`nexenne · ${data.get('name') ?? ''}`);
			const body = encodeURIComponent(String(data.get('notes') ?? ''));
			window.location.href = `mailto:${SITE.email}?subject=${subject}&body=${body}`;
			return;
		}

		sending = true;
		failed = false;
		try {
			data.append('access_key', ACCESS_KEY);
			data.append('subject', `nexenne contact · ${data.get('name') ?? ''}`);
			const res = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: data });
			const json = await res.json();
			if (json.success) {
				sent = true;
				form.reset();
			} else {
				failed = true;
			}
		} catch {
			failed = true;
		} finally {
			sending = false;
		}
	}
</script>

<div class="page-anim">
	<header class="page-title">
		<div><span class="meta">{$t('contact.meta')}</span></div>
		<div>
			<h1 class="display">{$t('contact.title')}</h1>
		</div>
	</header>

	<section class="section">
		<div class="contact-grid">
			<div>
				{#if sent}
					<div
						style="padding: 32px; border: 1px solid var(--accent); border-radius: var(--r-md); background: color-mix(in oklab, var(--accent), transparent 92%);"
					>
						<span class="eyebrow"><span class="dot"></span>{$t('contact.sent.eyebrow')}</span>
						<h3 style="margin-top: 10px;">{$t('contact.sent.title')}</h3>
						<p style="margin-top: 8px; color: var(--ink-2);">
							{$t('contact.sent.body')}
							<span class="mono"> · {SITE.email}</span>
						</p>
					</div>
				{:else}
					<form class="form" on:submit={onSubmit}>
						<!-- Honeypot: bots fill it, humans never see it. -->
						<input
							type="checkbox"
							name="botcheck"
							tabindex="-1"
							autocomplete="off"
							aria-hidden="true"
							style="display: none;"
						/>
						<div class="row-2">
							<div class="field">
								<label for="name">{$t('contact.form.name')}</label>
								<input
									id="name"
									name="name"
									type="text"
									placeholder={$t('contact.form.name.p')}
									required
								/>
							</div>
							<div class="field">
								<label for="company">{$t('contact.form.company')}</label>
								<input
									id="company"
									name="company"
									type="text"
									placeholder={$t('contact.form.company.p')}
								/>
							</div>
						</div>
						<div class="field">
							<label for="email">{$t('contact.form.email')}</label>
							<input
								id="email"
								name="email"
								type="email"
								placeholder={$t('contact.form.email.p')}
								required
							/>
						</div>
						<div class="field">
							<label for="shape">{$t('contact.form.shape')}</label>
							<select id="shape" name="shape">
								<option value="01">{$t('contact.form.shape.01')}</option>
								<option value="02">{$t('contact.form.shape.02')}</option>
								<option value="03">{$t('contact.form.shape.03')}</option>
								<option value="04">{$t('contact.form.shape.04')}</option>
								<option value="05">{$t('contact.form.shape.05')}</option>
								<option value="??">{$t('contact.form.shape.other')}</option>
							</select>
						</div>
						<div class="field">
							<label for="notes">{$t('contact.form.notes')}</label>
							<textarea id="notes" name="notes" placeholder={$t('contact.form.notes.p')}></textarea>
						</div>
						{#if failed}
							<p class="mono" style="font-size: 12px; color: #e5484d;">
								{$t('contact.error')} <span class="mono">{SITE.email}</span>
							</p>
						{/if}
						<div class="row form-submit-row" style="justify-content: space-between;">
							<span class="mono muted" style="font-size: 11px;">{$t('contact.form.nda')}</span>
							<button type="submit" class="btn btn--primary" data-hover disabled={sending}>
								{sending ? $t('contact.form.sending') : $t('contact.form.send')}
								<span class="arrow">↗</span></button
							>
						</div>
					</form>
				{/if}
			</div>

			<aside class="col" style="gap: 16px;">
				<div class="uses-box">
					<h3>{$t('contact.lines')}</h3>
					<ul style="list-style: none; padding: 0;">
						<li><span class="k">{$t('contact.lines.email')}</span> · {SITE.email}</li>
						<li><span class="k">{$t('contact.lines.phone')}</span> · {SITE.phone}</li>
						<li><span class="k">{$t('contact.lines.github')}</span> · github.com/signorenne</li>
					</ul>
				</div>
				<div class="uses-box">
					<h3>{$t('contact.starting_point')}</h3>
					<p style="font-size: 13px; color: var(--ink-2);">{$t('contact.starting_point.body')}</p>
				</div>
				<div class="uses-box">
					<h3>{$t('contact.starting_well')}</h3>
					<p style="font-size: 13px; color: var(--ink-2);">{$t('contact.starting_well.body')}</p>
				</div>
			</aside>
		</div>
	</section>
</div>
