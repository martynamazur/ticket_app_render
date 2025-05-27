router.get('/status', async (req, res) => {
    const id = req.query.id;

    const { data, error } = await supabase
        .from('transactions')
        .select('status')
        .eq('id', id);

    if (error || !data || data.length === 0) {
        return res.status(404).json({ status: 'not_found' });
    }

    res.json({ status: data[0].status });
});
