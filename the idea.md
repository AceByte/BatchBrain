BatchBrain:
a single page webpage made with react and typescript and such. built around this database:
DATABASE_URL='postgresql://neondb_owner:npg_ostKzH7NS5br@ep-fragrant-snow-al9jhd3k-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
its purpose is to keep track of the premix stock, showing when certain premix are low and need batching, aswell as analyzing the use of each premix over time. it should have the "premix inventory" showing the premix and the amounts, as well as what goes into making the premix. the sirups that we make in house and everything else. aswell as having a specsheet with all of our batched aswell as nonbatched cocktails.
regular cocktails, seasonal cocktails and our signature cocktails.
it should serve to standerdize the amount that we are left with after each weekly prep shift and the recipes used.
it shoud have an algorithm to calculate the prep ingredients from the spec of the cocktails, aswell as how many batches of the premix should be made to be within the specified threshold for each cocktail. and then basically showing a list of what to make, how many to make and what ingredients will be needed for each and in total.
it should have a modern, easy to use and read UI that makes it easy to add or remove premix to the stock count. 
the webpage will be hosted on vercel under batchbrain.vercel.app